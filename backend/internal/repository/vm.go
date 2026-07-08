package repository

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type PowerState string

const (
	PowerStateRunning PowerState = "running"
	PowerStateStopped PowerState = "stopped"
	PowerStatePaused  PowerState = "paused"
	PowerStateError   PowerState = "error"
)

type VirtualMachine struct {
	ID                UUID
	LibvirtID         string
	Name              string
	Hostname          string
	VCPU              int
	MemoryMB          int
	DiskGB            int
	OSType            string
	PowerState        PowerState
	VNCPort           *int
	SPICEPort         *int
	CreatedAt         time.Time
	UpdatedAt         time.Time
	LastStateChange   time.Time
	Metadata          map[string]interface{}
}

type UUID string

func (u UUID) Value() (driver.Value, error) {
	return string(u), nil
}

func (u *UUID) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	if str, ok := value.(string); ok {
		*u = UUID(str)
		return nil
	}
	return fmt.Errorf("cannot scan %T into UUID", value)
}

type VMRepository struct {
	db *sql.DB
}

func NewVMRepository(db *sql.DB) *VMRepository {
	return &VMRepository{db: db}
}

func (vr *VMRepository) Create(ctx context.Context, vm *VirtualMachine) error {
	metadata, err := json.Marshal(vm.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO virtual_machines
		(id, libvirt_id, name, hostname, vcpu, memory_mb, disk_gb, os_type, power_state, vnc_port, spice_port, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING created_at, updated_at, last_state_change
	`

	err = vr.db.QueryRowContext(
		ctx,
		query,
		vm.ID,
		vm.LibvirtID,
		vm.Name,
		vm.Hostname,
		vm.VCPU,
		vm.MemoryMB,
		vm.DiskGB,
		vm.OSType,
		vm.PowerState,
		vm.VNCPort,
		vm.SPICEPort,
		metadata,
	).Scan(&vm.CreatedAt, &vm.UpdatedAt, &vm.LastStateChange)

	if err != nil {
		if err.Error() == "pq: duplicate key value violates unique constraint \"virtual_machines_libvirt_id_key\"" {
			return fmt.Errorf("VM with this libvirt_id already exists")
		}
		return fmt.Errorf("failed to create VM: %w", err)
	}

	return nil
}

func (vr *VMRepository) GetByID(ctx context.Context, id UUID) (*VirtualMachine, error) {
	vm := &VirtualMachine{}
	var metadata json.RawMessage

	query := `
		SELECT id, libvirt_id, name, hostname, vcpu, memory_mb, disk_gb, os_type,
		       power_state, vnc_port, spice_port, created_at, updated_at, last_state_change, metadata
		FROM virtual_machines
		WHERE id = $1 AND deleted_at IS NULL
	`

	err := vr.db.QueryRowContext(ctx, query, id).Scan(
		&vm.ID,
		&vm.LibvirtID,
		&vm.Name,
		&vm.Hostname,
		&vm.VCPU,
		&vm.MemoryMB,
		&vm.DiskGB,
		&vm.OSType,
		&vm.PowerState,
		&vm.VNCPort,
		&vm.SPICEPort,
		&vm.CreatedAt,
		&vm.UpdatedAt,
		&vm.LastStateChange,
		&metadata,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("VM not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get VM: %w", err)
	}

	if err := json.Unmarshal(metadata, &vm.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	return vm, nil
}

func (vr *VMRepository) GetByLibvirtID(ctx context.Context, libvirtID string) (*VirtualMachine, error) {
	vm := &VirtualMachine{}
	var metadata json.RawMessage

	query := `
		SELECT id, libvirt_id, name, hostname, vcpu, memory_mb, disk_gb, os_type,
		       power_state, vnc_port, spice_port, created_at, updated_at, last_state_change, metadata
		FROM virtual_machines
		WHERE libvirt_id = $1 AND deleted_at IS NULL
	`

	err := vr.db.QueryRowContext(ctx, query, libvirtID).Scan(
		&vm.ID,
		&vm.LibvirtID,
		&vm.Name,
		&vm.Hostname,
		&vm.VCPU,
		&vm.MemoryMB,
		&vm.DiskGB,
		&vm.OSType,
		&vm.PowerState,
		&vm.VNCPort,
		&vm.SPICEPort,
		&vm.CreatedAt,
		&vm.UpdatedAt,
		&vm.LastStateChange,
		&metadata,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("VM not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get VM: %w", err)
	}

	if err := json.Unmarshal(metadata, &vm.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	return vm, nil
}

func (vr *VMRepository) Update(ctx context.Context, vm *VirtualMachine) error {
	metadata, err := json.Marshal(vm.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		UPDATE virtual_machines
		SET name = $1, hostname = $2, vcpu = $3, memory_mb = $4, disk_gb = $5,
		    os_type = $6, power_state = $7, vnc_port = $8, spice_port = $9,
		    metadata = $10, last_state_change = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $11 AND deleted_at IS NULL
		RETURNING updated_at, last_state_change
	`

	err = vr.db.QueryRowContext(
		ctx,
		query,
		vm.Name,
		vm.Hostname,
		vm.VCPU,
		vm.MemoryMB,
		vm.DiskGB,
		vm.OSType,
		vm.PowerState,
		vm.VNCPort,
		vm.SPICEPort,
		metadata,
		vm.ID,
	).Scan(&vm.UpdatedAt, &vm.LastStateChange)

	if err != nil {
		return fmt.Errorf("failed to update VM: %w", err)
	}

	return nil
}

func (vr *VMRepository) UpdatePowerState(ctx context.Context, id UUID, state PowerState) error {
	query := `
		UPDATE virtual_machines
		SET power_state = $1, last_state_change = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND deleted_at IS NULL
	`

	result, err := vr.db.ExecContext(ctx, query, state, id)
	if err != nil {
		return fmt.Errorf("failed to update power state: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("VM not found")
	}

	return nil
}

func (vr *VMRepository) Delete(ctx context.Context, id UUID) error {
	query := `
		UPDATE virtual_machines
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := vr.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete VM: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("VM not found")
	}

	return nil
}

func (vr *VMRepository) List(ctx context.Context, limit, offset int) ([]*VirtualMachine, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := `
		SELECT id, libvirt_id, name, hostname, vcpu, memory_mb, disk_gb, os_type,
		       power_state, vnc_port, spice_port, created_at, updated_at, last_state_change, metadata
		FROM virtual_machines
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := vr.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list VMs: %w", err)
	}
	defer rows.Close()

	var vms []*VirtualMachine
	for rows.Next() {
		vm := &VirtualMachine{}
		var metadata json.RawMessage

		err := rows.Scan(
			&vm.ID,
			&vm.LibvirtID,
			&vm.Name,
			&vm.Hostname,
			&vm.VCPU,
			&vm.MemoryMB,
			&vm.DiskGB,
			&vm.OSType,
			&vm.PowerState,
			&vm.VNCPort,
			&vm.SPICEPort,
			&vm.CreatedAt,
			&vm.UpdatedAt,
			&vm.LastStateChange,
			&metadata,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan VM: %w", err)
		}

		if err := json.Unmarshal(metadata, &vm.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		vms = append(vms, vm)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating VMs: %w", err)
	}

	return vms, nil
}

func (vr *VMRepository) Count(ctx context.Context) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM virtual_machines WHERE deleted_at IS NULL`

	err := vr.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count VMs: %w", err)
	}

	return count, nil
}

func (vr *VMRepository) ListByPowerState(ctx context.Context, state PowerState) ([]*VirtualMachine, error) {
	query := `
		SELECT id, libvirt_id, name, hostname, vcpu, memory_mb, disk_gb, os_type,
		       power_state, vnc_port, spice_port, created_at, updated_at, last_state_change, metadata
		FROM virtual_machines
		WHERE power_state = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
	`

	rows, err := vr.db.QueryContext(ctx, query, state)
	if err != nil {
		return nil, fmt.Errorf("failed to list VMs by power state: %w", err)
	}
	defer rows.Close()

	var vms []*VirtualMachine
	for rows.Next() {
		vm := &VirtualMachine{}
		var metadata json.RawMessage

		err := rows.Scan(
			&vm.ID,
			&vm.LibvirtID,
			&vm.Name,
			&vm.Hostname,
			&vm.VCPU,
			&vm.MemoryMB,
			&vm.DiskGB,
			&vm.OSType,
			&vm.PowerState,
			&vm.VNCPort,
			&vm.SPICEPort,
			&vm.CreatedAt,
			&vm.UpdatedAt,
			&vm.LastStateChange,
			&metadata,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan VM: %w", err)
		}

		if err := json.Unmarshal(metadata, &vm.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		vms = append(vms, vm)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating VMs: %w", err)
	}

	return vms, nil
}
