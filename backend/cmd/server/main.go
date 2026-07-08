package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/lanraeee/reemote/backend/config"
	"github.com/lanraeee/reemote/backend/internal/auth"
	"github.com/lanraeee/reemote/backend/internal/database"
	"github.com/lanraeee/reemote/backend/internal/repository"
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

	// Initialize services
	userService := service.NewUserService(userRepo, passwordManager, totpManager)
	vmService := service.NewVMService(vmRepo)

	// Initialize router
	router := http.NewServeMux()

	// Health check endpoint
	router.HandleFunc("/health", healthCheck)

	// User management endpoints
	router.HandleFunc("/api/v1/auth/register", handleRegister(userService))
	router.HandleFunc("/api/v1/auth/login", handleLogin(userService, tokenManager))
	router.HandleFunc("/api/v1/users/profile", handleGetProfile(tokenManager))

	// VM management endpoints
	router.HandleFunc("/api/v1/vms", handleListVMs(vmService, tokenManager))
	router.HandleFunc("POST /api/v1/vms", handleCreateVM(vmService, tokenManager))
	router.HandleFunc("/api/v1/vms/{id}", handleGetVM(vmService, tokenManager))
	router.HandleFunc("PUT /api/v1/vms/{id}", handleUpdateVM(vmService, tokenManager))
	router.HandleFunc("DELETE /api/v1/vms/{id}", handleDeleteVM(vmService, tokenManager))

	// Configure server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting server on %s", server.Addr)

		var err error
		if cfg.Server.TLSCert != "" && cfg.Server.TLSKey != "" {
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

func parseJSON(r *http.Request, v interface{}) error {
	return r.Header.Get("Content-Type") == "application/json" && r.Body != nil
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
}
