package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/lanraeee/reemote/backend/config"
	"github.com/lanraeee/reemote/backend/internal/auth"
	"github.com/lanraeee/reemote/backend/internal/console"
	"github.com/lanraeee/reemote/backend/internal/database"
	"github.com/lanraeee/reemote/backend/internal/libvirt"
	"github.com/lanraeee/reemote/backend/internal/repository"
	"github.com/lanraeee/reemote/backend/internal/security"
	"github.com/lanraeee/reemote/backend/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("Connecting to database: %s:%d/%s", cfg.Database.Host, cfg.Database.Port, cfg.Database.DBName)
	db, err := database.Connect(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close(db)

	log.Println("Database connected successfully")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	vmRepo := repository.NewVMRepository(db)

	// Initialize auth managers
	tokenManager := auth.NewTokenManager(cfg.Auth.JWTSecret)
	passwordManager := auth.NewPasswordManager(cfg.Security.BCryptCost, cfg.Auth.PasswordMinLength)
	totpManager := auth.NewTOTPManager(cfg.Auth.TOTPWindowSize)

	// Initialize libvirt components
	libvirtClient := libvirt.NewLibvirtClient(
		cfg.Libvirt.URI,
		cfg.Libvirt.MaxConnectionPooling,
		cfg.Libvirt.ConnectionTimeout,
		cfg.Libvirt.CircuitBreakerLimit,
		cfg.Libvirt.CircuitBreakerReset,
	)
	defer libvirtClient.Close()

	log.Println("Initializing libvirt connection...")
	if err := libvirtClient.Ping(); err != nil {
		log.Printf("Warning: Libvirt connection failed: %v. Running in degraded mode.", err)
	}

	domainManager := libvirt.NewDomainManager(libvirtClient)
	eventBus := libvirt.NewEventBus(100)
	eventMonitor := libvirt.NewEventMonitor(eventBus, domainManager, 30*time.Second)

	// Start event monitoring in background
	go eventMonitor.Start(context.Background())

	// Initialize services
	userService := service.NewUserService(userRepo, passwordManager, totpManager)
	vmService := service.NewVMService(vmRepo, domainManager, eventMonitor)
	permRepo := repository.NewPermissionRepository(db)
	permService := service.NewPermissionService(permRepo)

	// Initialize console management
	consoleManager := console.NewConsoleManager()
	consoleHandler := console.NewWebSocketConsoleHandler(consoleManager)

	// Start console cleanup routine
	go consoleHandler.StartCleanupRoutine(5*time.Minute, 30*time.Minute)

	// Initialize security components
	rateLimiter := security.NewRateLimiter(
		cfg.Security.UserRateLimit,
		cfg.Security.IPRateLimit,
		cfg.Security.RateLimitWindow,
	)

	tlsManager := security.NewTLSManager(cfg.Server.TLSCert, cfg.Server.TLSKey)
	if cfg.Server.TLSCert != "" && cfg.Server.TLSKey != "" {
		if err := tlsManager.LoadCertificates(); err != nil {
			log.Fatalf("Failed to load TLS certificates: %v", err)
		}
		log.Println("TLS certificates loaded successfully")

		// Check certificate expiry
		if expiry, ok := tlsManager.CheckCertificateExpiry(cfg.Security.CertExpiryWarningDays); !ok {
			log.Printf("Warning: %s", expiry)
		}
	}

	// Initialize router
	router := http.NewServeMux()

	// Health check endpoint
	router.HandleFunc("/health", healthCheck)

	// User management endpoints
	router.HandleFunc("/api/v1/auth/register", withRateLimit(handleRegister(userService), rateLimiter, false))
	router.HandleFunc("/api/v1/auth/login", withRateLimit(handleLogin(userService, tokenManager), rateLimiter, false))
	router.HandleFunc("/api/v1/users/profile", withRateLimit(handleGetProfile(tokenManager), rateLimiter, true))

	// VM management endpoints
	router.HandleFunc("/api/v1/vms", withRateLimit(handleListVMs(vmService, tokenManager), rateLimiter, true))
	router.HandleFunc("POST /api/v1/vms", withRateLimit(handleCreateVM(vmService, tokenManager), rateLimiter, true))
	router.HandleFunc("/api/v1/vms/{id}", withRateLimit(handleGetVM(vmService, tokenManager), rateLimiter, true))
	router.HandleFunc("PUT /api/v1/vms/{id}", withRateLimit(handleUpdateVM(vmService, tokenManager), rateLimiter, true))
	router.HandleFunc("DELETE /api/v1/vms/{id}", withRateLimit(handleDeleteVM(vmService, tokenManager), rateLimiter, true))

	// Console endpoints (Phase 3) - stricter rate limits for interactive sessions
	router.HandleFunc("POST /api/v1/vms/{vm_id}/console/connect", withRateLimit(handleConsoleConnect(consoleHandler, tokenManager, permService), rateLimiter, true))
	router.HandleFunc("POST /api/v1/console/{session_id}/message", withRateLimit(handleConsoleMessage(consoleHandler, tokenManager), rateLimiter, true))
	router.HandleFunc("POST /api/v1/console/{session_id}/disconnect", withRateLimit(handleConsoleDisconnect(consoleHandler, tokenManager), rateLimiter, true))
	router.HandleFunc("GET /api/v1/console/{session_id}/stats", withRateLimit(handleConsoleStats(consoleManager, tokenManager), rateLimiter, true))

	// Configure server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Apply TLS configuration if available
	if tlsManager.IsTLSEnabled() {
		server.TLSConfig = tlsManager.GetConfig()
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting server on %s", server.Addr)

		var err error
		if tlsManager.IsTLSEnabled() {
			err = server.ListenAndServeTLS(cfg.Server.TLSCert, cfg.Server.TLSKey)
		} else {
			err = server.ListenAndServe()
		}

		if err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down server...")

	// Stop event monitoring
	if err := eventMonitor.Stop(); err != nil {
		log.Printf("Event monitor shutdown error: %v", err)
	}

	// Stop event bus
	if err := eventBus.Stop(); err != nil {
		log.Printf("Event bus shutdown error: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}

	log.Println("Server stopped")
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "ok"}`))
}

func handleRegister(userService *service.UserService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			FullName string `json:"full_name"`
		}

		if err := parseJSON(r, &req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		resp, err := userService.Register(r.Context(), &service.RegisterRequest{
			Email:    req.Email,
			Password: req.Password,
			FullName: req.FullName,
		})

		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		writeJSON(w, http.StatusCreated, resp)
	}
}

func handleLogin(userService *service.UserService, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			TOTPCode string `json:"totp_code,omitempty"`
		}

		if err := parseJSON(r, &req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var totpCode *string
		if req.TOTPCode != "" {
			totpCode = &req.TOTPCode
		}

		resp, err := userService.Login(r.Context(), &service.LoginRequest{
			Email:    req.Email,
			Password: req.Password,
			TOTPCode: totpCode,
		})

		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		if resp.Tokens != nil {
			resp.Tokens, _ = tokenManager.GenerateTokenPair(
				resp.UserID,
				resp.Email,
				resp.IsAdmin,
				15*time.Minute,
				7*24*time.Hour,
			)
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

func handleGetProfile(tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		claims, err := tokenManager.ValidateAccessToken(token)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"user_id": claims.UserID,
			"email":   claims.Email,
			"is_admin": claims.IsAdmin,
		})
	}
}

func handleListVMs(vmService *service.VMService, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !validateAuth(w, r, tokenManager) {
			return
		}

		limit := 50
		offset := 0

		resp, err := vmService.ListVMs(r.Context(), limit, offset)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

func handleCreateVM(vmService *service.VMService, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		claims := validateAuth(w, r, tokenManager)
		if claims == nil {
			return
		}

		if !claims.IsAdmin {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		var req service.CreateVMRequest
		if err := parseJSON(r, &req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		resp, err := vmService.CreateVM(r.Context(), &req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		writeJSON(w, http.StatusCreated, resp)
	}
}

func handleGetVM(vmService *service.VMService, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !validateAuth(w, r, tokenManager) {
			return
		}

		vmID := r.PathValue("id")
		resp, err := vmService.GetVM(r.Context(), vmID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

func handleUpdateVM(vmService *service.VMService, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if !validateAuth(w, r, tokenManager) {
			return
		}

		vmID := r.PathValue("id")
		var req service.UpdateVMRequest
		if err := parseJSON(r, &req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		resp, err := vmService.UpdateVM(r.Context(), vmID, &req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

func handleDeleteVM(vmService *service.VMService, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		claims := validateAuth(w, r, tokenManager)
		if claims == nil {
			return
		}

		if !claims.IsAdmin {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		vmID := r.PathValue("id")
		if err := vmService.DeleteVM(r.Context(), vmID); err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func validateAuth(w http.ResponseWriter, r *http.Request, tokenManager *auth.TokenManager) *auth.TokenClaims {
	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return nil
	}

	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	claims, err := tokenManager.ValidateAccessToken(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return nil
	}

	return claims
}

func handleConsoleConnect(consoleHandler *console.WebSocketConsoleHandler, tokenManager *auth.TokenManager, permService *service.PermissionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		claims := validateAuth(w, r, tokenManager)
		if claims == nil {
			return
		}

		vmID := r.PathValue("vm_id")
		hasAccess, err := permService.CheckAccess(r.Context(), claims.UserID, vmID, "view")
		if err != nil || !hasAccess {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		consoleHandler.HandleConnect(w, r)
	}
}

func handleConsoleMessage(consoleHandler *console.WebSocketConsoleHandler, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		claims := validateAuth(w, r, tokenManager)
		if claims == nil {
			return
		}

		consoleHandler.HandleMessage(w, r)
	}
}

func handleConsoleDisconnect(consoleHandler *console.WebSocketConsoleHandler, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		claims := validateAuth(w, r, tokenManager)
		if claims == nil {
			return
		}

		consoleHandler.HandleDisconnect(w, r)
	}
}

func handleConsoleStats(consoleManager *console.ConsoleManager, tokenManager *auth.TokenManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		claims := validateAuth(w, r, tokenManager)
		if claims == nil {
			return
		}

		sessionID := r.PathValue("session_id")
		session, err := consoleManager.GetSession(sessionID)
		if err != nil {
			http.Error(w, "Session not found", http.StatusNotFound)
			return
		}

		stats := session.GetStats()
		writeJSON(w, http.StatusOK, stats)
	}
}

func parseJSON(r *http.Request, v interface{}) error {
	return r.Header.Get("Content-Type") == "application/json" && r.Body != nil
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxied requests)
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		return strings.Split(forwarded, ",")[0]
	}
	// Check X-Real-IP header
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}
	// Fall back to remote address
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

func withRateLimit(handler http.HandlerFunc, limiter *security.RateLimiter, requireAuth bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		clientIP := getClientIP(r)
		var userID string

		if requireAuth {
			token := r.Header.Get("Authorization")
			if token != "" && len(token) > 7 && token[:7] == "Bearer " {
				token = token[7:]
			}
			// We don't have the token manager here, so we'll extract user ID from context later
			// For now, use the token as a user identifier
			if token != "" {
				userID = token[:16] // Use first 16 chars as simple identifier
			}
		}

		if userID == "" {
			userID = clientIP
		}

		allowed, errMsg := limiter.Allow(userID, clientIP)
		if !allowed {
			http.Error(w, errMsg, http.StatusTooManyRequests)
			return
		}

		handler(w, r)
	}
}
