package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lanraeee/reemote/backend/internal/repository"
)

type PermissionService struct {
	permRepo *repository.PermissionRepository
}

func NewPermissionService(permRepo *repository.PermissionRepository) *PermissionService {
	return &PermissionService{permRepo: permRepo}
}

type GrantAccessRequest struct {
	UserID      string `json:"user_id"`
	VMID        string `json:"vm_id"`
	AccessLevel string `json:"access_level"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

type PermissionResponse struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	VMID        string     `json:"vm_id"`
	AccessLevel string     `json:"access_level"`
	GrantedAt   time.Time  `json:"granted_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

func (ps *PermissionService) GrantAccess(ctx context.Context, grantedByID string, req *GrantAccessRequest) (*PermissionResponse, error) {
	// Validate access level
	switch repository.AccessLevel(req.AccessLevel) {
	case repository.AccessLevelView, repository.AccessLevelControl, repository.AccessLevelAdmin:
		// Valid
	default:
		return nil, fmt.Errorf("invalid access level: %s", req.AccessLevel)
	}

	// Validate expiry is in future
	if req.ExpiresAt != nil && req.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("expiry time must be in the future")
	}

	perm := &repository.Permission{
		ID:          uuid.New().String(),
		UserID:      req.UserID,
		VMID:        req.VMID,
		AccessLevel: repository.AccessLevel(req.AccessLevel),
		GrantedBy:   &grantedByID,
		ExpiresAt:   req.ExpiresAt,
	}

	if err := ps.permRepo.Grant(ctx, perm); err != nil {
		return nil, fmt.Errorf("failed to grant access: %w", err)
	}

	return &PermissionResponse{
		ID:          perm.ID,
		UserID:      perm.UserID,
		VMID:        perm.VMID,
		AccessLevel: string(perm.AccessLevel),
		GrantedAt:   perm.GrantedAt,
		ExpiresAt:   perm.ExpiresAt,
	}, nil
}

func (ps *PermissionService) CheckAccess(ctx context.Context, userID, vmID, requiredLevel string) (bool, error) {
	hasAccess, err := ps.permRepo.CheckAccess(ctx, userID, vmID, repository.AccessLevel(requiredLevel))
	if err != nil {
		return false, fmt.Errorf("failed to check access: %w", err)
	}

	return hasAccess, nil
}

func (ps *PermissionService) GetUserAccess(ctx context.Context, userID string) (map[string]string, error) {
	access, err := ps.permRepo.GetUserVMAccess(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user access: %w", err)
	}

	result := make(map[string]string)
	for vmID, level := range access {
		result[vmID] = string(level)
	}

	return result, nil
}

func (ps *PermissionService) RevokeAccess(ctx context.Context, userID, vmID string) error {
	if err := ps.permRepo.Revoke(ctx, userID, vmID); err != nil {
		return fmt.Errorf("failed to revoke access: %w", err)
	}

	return nil
}

type UserAccessResponse struct {
	VMAccess map[string]string `json:"vm_access"`
}

func (ps *PermissionService) ListUserVMAccess(ctx context.Context, userID string) (*UserAccessResponse, error) {
	access, err := ps.GetUserAccess(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list access: %w", err)
	}

	return &UserAccessResponse{VMAccess: access}, nil
}
