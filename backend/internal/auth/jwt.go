package auth

import (
	"crypto/subtle"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenClaims struct {
	UserID    string   `json:"user_id"`
	Email     string   `json:"email"`
	IsAdmin   bool     `json:"is_admin"`
	TokenID   string   `json:"token_id"`
	ExpiresAt int64   `json:"exp"`
	jwt.RegisteredClaims
}

type RefreshTokenClaims struct {
	UserID  string `json:"user_id"`
	TokenID string `json:"token_id"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type TokenManager struct {
	secret string
}

func NewTokenManager(secret string) *TokenManager {
	return &TokenManager{secret: secret}
}

func (tm *TokenManager) GenerateTokenPair(userID, email string, isAdmin bool, accessExpiry, refreshExpiry time.Duration) (*TokenPair, error) {
	tokenID := uuid.New().String()
	now := time.Now()

	accessToken, err := tm.generateAccessToken(userID, email, isAdmin, tokenID, now, accessExpiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := tm.generateRefreshToken(userID, tokenID, now, refreshExpiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(accessExpiry.Seconds()),
		TokenType:    "Bearer",
	}, nil
}

func (tm *TokenManager) generateAccessToken(userID, email string, isAdmin bool, tokenID string, issuedAt time.Time, expiry time.Duration) (string, error) {
	claims := TokenClaims{
		UserID:  userID,
		Email:   email,
		IsAdmin: isAdmin,
		TokenID: tokenID,
		ExpiresAt: issuedAt.Add(expiry).Unix(),
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			ExpiresAt: jwt.NewNumericDate(issuedAt.Add(expiry)),
			NotBefore: jwt.NewNumericDate(issuedAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(tm.secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

func (tm *TokenManager) generateRefreshToken(userID, tokenID string, issuedAt time.Time, expiry time.Duration) (string, error) {
	claims := RefreshTokenClaims{
		UserID:  userID,
		TokenID: tokenID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			ExpiresAt: jwt.NewNumericDate(issuedAt.Add(expiry)),
			NotBefore: jwt.NewNumericDate(issuedAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(tm.secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return tokenString, nil
}

func (tm *TokenManager) ValidateAccessToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(tm.secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

func (tm *TokenManager) ValidateRefreshToken(tokenString string) (*RefreshTokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(tm.secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse refresh token: %w", err)
	}

	claims, ok := token.Claims.(*RefreshTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid refresh token claims")
	}

	return claims, nil
}

func (tm *TokenManager) HashToken(token string) string {
	hash := jwt.New(jwt.SigningMethodHS256)
	hash.SignedString(append([]byte(tm.secret), []byte(token)...))
	return fmt.Sprintf("%x", hash)
}

func (tm *TokenManager) VerifyTokenHash(token, hash string) bool {
	computedHash := tm.HashToken(token)
	return subtle.ConstantTimeCompare([]byte(computedHash), []byte(hash)) == 1
}
