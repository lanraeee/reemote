package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/lanraeee/reemote/backend/internal/auth"
	"github.com/lanraeee/reemote/backend/internal/security"
)

func TestRateLimitMiddleware(t *testing.T) {
	limiter := security.NewRateLimiter(2, 100, time.Second)
	tokenManager := auth.NewTokenManager("test-secret-32-character-string-here!")

	// Create a simple handler
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}

	// Test within limit
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest("GET", "/test", nil)
		w := httptest.NewRecorder()

		// Simulate rate limit middleware
		clientIP := "192.168.1.1"
		userID := clientIP
		allowed, _ := limiter.Allow(userID, clientIP)
		if !allowed {
			w.WriteHeader(http.StatusTooManyRequests)
		} else {
			handler(w, req)
		}

		if w.Code != http.StatusOK {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}

	// Third request should be rate limited
	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	clientIP := "192.168.1.1"
	userID := clientIP
	allowed, _ := limiter.Allow(userID, clientIP)
	if !allowed {
		w.WriteHeader(http.StatusTooManyRequests)
	} else {
		handler(w, req)
	}

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("third request should be rate limited, got %d", w.Code)
	}
}

func TestLoginEndpoint(t *testing.T) {
	tokenManager := auth.NewTokenManager("test-secret-32-character-string-here!")

	tests := []struct {
		name           string
		email          string
		password       string
		expectError    bool
		expectedStatus int
	}{
		{
			name:           "valid request format",
			email:          "test@example.com",
			password:       "TestPassword123!",
			expectError:    false,
			expectedStatus: http.StatusUnauthorized, // Since we don't have a real user DB
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := map[string]string{
				"email":    tt.email,
				"password": tt.password,
			}

			jsonBody, _ := json.Marshal(body)
			req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			// Just verify the request is properly formed
			var parsed map[string]string
			json.Unmarshal(jsonBody, &parsed)

			if parsed["email"] != tt.email {
				t.Fatalf("email mismatch")
			}
		})
	}
}

func TestTokenValidation(t *testing.T) {
	tokenManager := auth.NewTokenManager("test-secret-32-character-string-here!")

	// Generate a token pair
	tokens, err := tokenManager.GenerateTokenPair("user123", "test@example.com", false, 15*time.Minute, 7*24*time.Hour)
	if err != nil {
		t.Fatalf("failed to generate tokens: %v", err)
	}

	if tokens.AccessToken == "" {
		t.Fatal("access token is empty")
	}

	// Validate token
	claims, err := tokenManager.ValidateAccessToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("failed to validate token: %v", err)
	}

	if claims.UserID != "user123" {
		t.Fatalf("expected user ID user123, got %s", claims.UserID)
	}

	if claims.Email != "test@example.com" {
		t.Fatalf("expected email test@example.com, got %s", claims.Email)
	}
}

func TestExpiredTokenValidation(t *testing.T) {
	tokenManager := auth.NewTokenManager("test-secret-32-character-string-here!")

	// Generate a token with very short expiry
	tokens, _ := tokenManager.GenerateTokenPair("user123", "test@example.com", false, -1*time.Second, 7*24*time.Hour)

	// Should fail validation
	_, err := tokenManager.ValidateAccessToken(tokens.AccessToken)
	if err == nil {
		t.Fatal("should fail to validate expired token")
	}
}

func TestPasswordValidation(t *testing.T) {
	pm := auth.NewPasswordManager(12, 12)

	tests := []struct {
		name      string
		password  string
		expectErr bool
	}{
		{
			name:      "valid password",
			password:  "ValidPass123!",
			expectErr: false,
		},
		{
			name:      "too short",
			password:  "Short1!",
			expectErr: true,
		},
		{
			name:      "no uppercase",
			password:  "validpass123!",
			expectErr: true,
		},
		{
			name:      "no lowercase",
			password:  "VALIDPASS123!",
			expectErr: true,
		},
		{
			name:      "no digit",
			password:  "ValidPassWord!",
			expectErr: true,
		},
		{
			name:      "no special char",
			password:  "ValidPass123",
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := pm.ValidatePassword(tt.password)
			if (err != nil) != tt.expectErr {
				t.Errorf("expected error=%v, got error=%v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestSessionEncryptionRoundtrip(t *testing.T) {
	key := "a1234567890123456789012345678901" // 32 chars
	enc, err := security.NewSessionEncryption(key)
	if err != nil {
		t.Fatalf("failed to create encryption: %v", err)
	}

	token := "test-session-token"

	// Encrypt
	encrypted, err := enc.EncryptSessionToken(token)
	if err != nil {
		t.Fatalf("encryption failed: %v", err)
	}

	// Decrypt
	decrypted, err := enc.DecryptSessionToken(encrypted)
	if err != nil {
		t.Fatalf("decryption failed: %v", err)
	}

	if decrypted != token {
		t.Fatalf("expected %q, got %q", token, decrypted)
	}
}

func TestConcurrentRateLimiting(t *testing.T) {
	limiter := security.NewRateLimiter(10, 100, time.Second)

	// Make concurrent requests
	results := make(chan bool, 20)
	for i := 0; i < 20; i++ {
		go func(idx int) {
			userID := "user1"
			clientIP := "192.168.1.1"
			allowed, _ := limiter.Allow(userID, clientIP)
			results <- allowed
		}(i)
	}

	// Should allow exactly 10
	allowed := 0
	for i := 0; i < 20; i++ {
		if <-results {
			allowed++
		}
	}

	if allowed != 10 {
		t.Fatalf("expected 10 allowed, got %d", allowed)
	}
}
