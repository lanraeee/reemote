package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type AccessLevel string

const (
	AccessLevelView    AccessLevel = "view"
	AccessLevelControl AccessLevel = "control"
	AccessLevelAdmin   AccessLevel = "admin"
)

type Permission struct {
	ID        string
	UserID    string
	VMID      string
	AccessLevel AccessLevel
	GrantedAt time.Time
	GrantedBy *string
	ExpiresAt *time.Time
}

type PermissionRepository struct {
	db *sql.DB
}

func NewPermissionRepository(db *sql.DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

func (pr *PermissionRepository) Grant(ctx context.Context, permission *Permission) error {
	query := `
		INSERT INTO permissions (id, user_id, vm_id, access_level, granted_by, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING granted_at
	`

	err := pr.db.QueryRowContext(
		ctx,
		query,
		permission.ID,
		permission.UserID,
		permission.VMID,
		permission.AccessLevel,
		permission.GrantedBy,
		permission.ExpiresAt,
	).Scan(&permission.GrantedAt)

	if err != nil {
		if err.Error() == "pq: duplicate key value violates unique constraint \"permissions_user_id_vm_id_key\"" {
			return fmt.Errorf("permission already exists for this user and VM")
		}
		return fmt.Errorf("failed to grant permission: %w", err)
	}

	return nil
}

func (pr *PermissionRepository) CheckAccess(ctx context.Context, userID, vmID string, requiredLevel AccessLevel) (bool, error) {
	query := `
		SELECT access_level
		FROM permissions
		WHERE user_id = $1 AND vm_id = $2 AND deleted_at IS NULL
		AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
	`

	var accessLevel AccessLevel
	err := pr.db.QueryRowContext(ctx, query, userID, vmID).Scan(&accessLevel)

	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check access: %w", err)
	}

	return pr.hasAccess(accessLevel, requiredLevel), nil
}

func (pr *PermissionRepository) GetUserVMAccess(ctx context.Context, userID string) (map[string]AccessLevel, error) {
	query := `
		SELECT vm_id, access_level
		FROM permissions
		WHERE user_id = $1 AND deleted_at IS NULL
		AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
	`

	rows, err := pr.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get VM access: %w", err)
	}
	defer rows.Close()

	access := make(map[string]AccessLevel)
	for rows.Next() {
		var vmID string
		var level AccessLevel

		if err := rows.Scan(&vmID, &level); err != nil {
			return nil, fmt.Errorf("failed to scan access: %w", err)
		}

		access[vmID] = level
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating access: %w", err)
	}

	return access, nil
}

func (pr *PermissionRepository) GetVMUsers(ctx context.Context, vmID string) ([]*Permission, error) {
	query := `
		SELECT id, user_id, vm_id, access_level, granted_at, granted_by, expires_at
		FROM permissions
		WHERE vm_id = $1 AND deleted_at IS NULL
		AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
	`

	rows, err := pr.db.QueryContext(ctx, query, vmID)
	if err != nil {
		return nil, fmt.Errorf("failed to get VM users: %w", err)
	}
	defer rows.Close()

	var permissions []*Permission
	for rows.Next() {
		perm := &Permission{}

		if err := rows.Scan(
			&perm.ID,
			&perm.UserID,
			&perm.VMID,
			&perm.AccessLevel,
			&perm.GrantedAt,
			&perm.GrantedBy,
			&perm.ExpiresAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}

		permissions = append(permissions, perm)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating permissions: %w", err)
	}

	return permissions, nil
}

func (pr *PermissionRepository) Revoke(ctx context.Context, userID, vmID string) error {
	query := `
		UPDATE permissions
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND vm_id = $2 AND deleted_at IS NULL
	`

	result, err := pr.db.ExecContext(ctx, query, userID, vmID)
	if err != nil {
		return fmt.Errorf("failed to revoke permission: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("permission not found")
	}

	return nil
}

func (pr *PermissionRepository) hasAccess(userLevel, requiredLevel AccessLevel) bool {
	levelHierarchy := map[AccessLevel]int{
		AccessLevelView:    1,
		AccessLevelControl: 2,
		AccessLevelAdmin:   3,
	}

	return levelHierarchy[userLevel] >= levelHierarchy[requiredLevel]
}
