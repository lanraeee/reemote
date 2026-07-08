package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lanraeee/reemote/backend/internal/auth"
	"github.com/lanraeee/reemote/backend/internal/repository"
)

type UserService struct {
	userRepo        *repository.UserRepository
	passwordManager *auth.PasswordManager
	totpManager     *auth.TOTPManager
}

func NewUserService(
	userRepo *repository.UserRepository,
	passwordManager *auth.PasswordManager,
	totpManager *auth.TOTPManager,
) *UserService {
	return &UserService{
		userRepo:        userRepo,
		passwordManager: passwordManager,
		totpManager:     totpManager,
	}
}

type RegisterRequest struct {
	Email    string
	Password string
	FullName string
}

type RegisterResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func (us *UserService) Register(ctx context.Context, req *RegisterRequest) (*RegisterResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, fmt.Errorf("email and password required")
	}

	existingUser, _ := us.userRepo.GetByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, fmt.Errorf("email already registered")
	}

	passwordHash, err := us.passwordManager.Hash(req.Password)
	if err != nil {
		return nil, fmt.Errorf("invalid password: %w", err)
	}

	user := &repository.User{
		ID:           uuid.New().String(),
		Email:        req.Email,
		PasswordHash: passwordHash,
		FullName:     req.FullName,
		IsAdmin:      false,
		IsActive:     true,
	}

	if err := us.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &RegisterResponse{
		ID:    user.ID,
		Email: user.Email,
	}, nil
}

type LoginRequest struct {
	Email    string
	Password string
	TOTPCode *string
}

type LoginResponse struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	IsAdmin   bool      `json:"is_admin"`
	TOTPSetup bool      `json:"totp_setup,omitempty"`
	Tokens    *auth.TokenPair `json:"tokens,omitempty"`
}

func (us *UserService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, fmt.Errorf("email and password required")
	}

	user, err := us.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if !user.IsActive {
		return nil, fmt.Errorf("account is disabled")
	}

	if !us.passwordManager.Verify(req.Password, user.PasswordHash) {
		return nil, fmt.Errorf("invalid credentials")
	}

	resp := &LoginResponse{
		UserID:  user.ID,
		Email:   user.Email,
		IsAdmin: user.IsAdmin,
	}

	if user.TOTPEnabled {
		if req.TOTPCode == nil || !us.totpManager.VerifyTokenWithWindow(*user.TOTPSecret, *req.TOTPCode) {
			return resp, nil
		}
	}

	if err := us.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	return resp, nil
}

type TOTPSetupResponse struct {
	Secret string `json:"secret"`
	QRCode string `json:"qr_code"`
}

func (us *UserService) SetupTOTP(ctx context.Context, userID string) (*TOTPSetupResponse, error) {
	user, err := us.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	secret, qrCodeURL, err := us.totpManager.GenerateSecret(user.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP: %w", err)
	}

	return &TOTPSetupResponse{
		Secret: secret,
		QRCode: qrCodeURL,
	}, nil
}

func (us *UserService) ConfirmTOTP(ctx context.Context, userID, secret, code string) error {
	user, err := us.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	if !us.totpManager.VerifyToken(code, secret) {
		return fmt.Errorf("invalid TOTP code")
	}

	user.TOTPSecret = &secret
	user.TOTPEnabled = true

	if err := us.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to save TOTP: %w", err)
	}

	return nil
}

func (us *UserService) DisableTOTP(ctx context.Context, userID string) error {
	user, err := us.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	user.TOTPEnabled = false
	user.TOTPSecret = nil

	if err := us.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to disable TOTP: %w", err)
	}

	return nil
}

type ChangePasswordRequest struct {
	CurrentPassword string
	NewPassword     string
}

func (us *UserService) ChangePassword(ctx context.Context, userID string, req *ChangePasswordRequest) error {
	user, err := us.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	if !us.passwordManager.Verify(req.CurrentPassword, user.PasswordHash) {
		return fmt.Errorf("current password is incorrect")
	}

	newHash, err := us.passwordManager.Hash(req.NewPassword)
	if err != nil {
		return fmt.Errorf("invalid password: %w", err)
	}

	if err := us.userRepo.UpdatePassword(ctx, userID, newHash); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

func (us *UserService) GetUser(ctx context.Context, userID string) (*repository.User, error) {
	return us.userRepo.GetByID(ctx, userID)
}

func (us *UserService) UpdateUser(ctx context.Context, userID, fullName string) error {
	user, err := us.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	user.FullName = fullName
	user.UpdatedAt = time.Now()

	return us.userRepo.Update(ctx, user)
}

func (us *UserService) ListUsers(ctx context.Context, limit, offset int) ([]*repository.User, error) {
	return us.userRepo.List(ctx, limit, offset)
}

func (us *UserService) DeleteUser(ctx context.Context, userID string) error {
	return us.userRepo.Delete(ctx, userID)
}
