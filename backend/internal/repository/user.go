package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type User struct {
	ID           string
	Email        string
	PasswordHash string
	FullName     string
	IsAdmin      bool
	IsActive     bool
	TOTPSecret   *string
	TOTPEnabled  bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	LastLogin    *time.Time
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (ur *UserRepository) Create(ctx context.Context, user *User) error {
	query := `
		INSERT INTO users (id, email, password_hash, full_name, is_admin, is_active, totp_secret, totp_enabled)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`

	err := ur.db.QueryRowContext(
		ctx,
		query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.IsAdmin,
		user.IsActive,
		user.TOTPSecret,
		user.TOTPEnabled,
	).Scan(&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err.Error() == "pq: duplicate key value violates unique constraint \"users_email_key\"" {
			return fmt.Errorf("email already exists")
		}
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (ur *UserRepository) GetByID(ctx context.Context, id string) (*User, error) {
	user := &User{}

	query := `
		SELECT id, email, password_hash, full_name, is_admin, is_active,
		       totp_secret, totp_enabled, created_at, updated_at, last_login
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`

	err := ur.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.IsAdmin,
		&user.IsActive,
		&user.TOTPSecret,
		&user.TOTPEnabled,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLogin,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (ur *UserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	user := &User{}

	query := `
		SELECT id, email, password_hash, full_name, is_admin, is_active,
		       totp_secret, totp_enabled, created_at, updated_at, last_login
		FROM users
		WHERE email = $1 AND deleted_at IS NULL
	`

	err := ur.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.IsAdmin,
		&user.IsActive,
		&user.TOTPSecret,
		&user.TOTPEnabled,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLogin,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (ur *UserRepository) Update(ctx context.Context, user *User) error {
	query := `
		UPDATE users
		SET full_name = $1, is_admin = $2, is_active = $3,
		    totp_secret = $4, totp_enabled = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6 AND deleted_at IS NULL
		RETURNING updated_at
	`

	err := ur.db.QueryRowContext(
		ctx,
		query,
		user.FullName,
		user.IsAdmin,
		user.IsActive,
		user.TOTPSecret,
		user.TOTPEnabled,
		user.ID,
	).Scan(&user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

func (ur *UserRepository) UpdatePassword(ctx context.Context, userID, passwordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND deleted_at IS NULL
	`

	result, err := ur.db.ExecContext(ctx, query, passwordHash, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (ur *UserRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	query := `
		UPDATE users
		SET last_login = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`

	_, err := ur.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	return nil
}

func (ur *UserRepository) Delete(ctx context.Context, userID string) error {
	query := `
		UPDATE users
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := ur.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (ur *UserRepository) List(ctx context.Context, limit, offset int) ([]*User, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := `
		SELECT id, email, password_hash, full_name, is_admin, is_active,
		       totp_secret, totp_enabled, created_at, updated_at, last_login
		FROM users
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := ur.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		user := &User{}
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.PasswordHash,
			&user.FullName,
			&user.IsAdmin,
			&user.IsActive,
			&user.TOTPSecret,
			&user.TOTPEnabled,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.LastLogin,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	return users, nil
}

func (ur *UserRepository) Count(ctx context.Context) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`

	err := ur.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count users: %w", err)
	}

	return count, nil
}
