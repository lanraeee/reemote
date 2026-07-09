package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lanraeee/reemote/backend/internal/libvirt"
	"github.com/lanraeee/reemote/backend/internal/repository"
)

type VMService struct {
	vmRepo          *repository.VMRepository
	domainManager   *libvirt.DomainManager
	eventMonitor    *libvirt.EventMonitor
}

func NewVMService(vmRepo *repository.VMRepository, domainManager *libvirt.DomainManager, eventMonitor *libvirt.EventMonitor) *VMService {
	return &VMService{
		vmRepo:        vmRepo,
		domainManager: domainManager,
		eventMonitor:  eventMonitor,
	}
}

type CreateVMRequest struct {
	LibvirtID string                 `json:"libvirt_id"`
	Name      string                 `json:"name"`
	Hostname  string                 `json:"hostname"`
	VCPU      int                    `json:"vcpu"`
	MemoryMB  int                    `json:"memory_mb"`
	DiskGB    int                    `json:"disk_gb"`
	OSType    string                 `json:"os_type"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

type VMResponse struct {
	ID              string                 `json:"id"`
	LibvirtID       string                 `json:"libvirt_id"`
	Name            string                 `json:"name"`
	Hostname        string                 `json:"hostname"`
	VCPU            int                    `json:"vcpu"`
	MemoryMB        int                    `json:"memory_mb"`
	DiskGB          int                    `json:"disk_gb"`
	OSType          string                 `json:"os_type"`
	PowerState      string                 `json:"power_state"`
	VNCPort         *int                   `json:"vnc_port,omitempty"`
	SPICEPort       *int                   `json:"spice_port,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
	LastStateChange time.Time              `json:"last_state_change"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

func (vs *VMService) CreateVM(ctx context.Context, req *CreateVMRequest) (*VMResponse, error) {
	if req.Name == "" || req.LibvirtID == "" {
		return nil, fmt.Errorf("name and libvirt_id required")
	}

	if req.VCPU <= 0 || req.MemoryMB <= 0 || req.DiskGB <= 0 {
		return nil, fmt.Errorf("vcpu, memory_mb, and disk_gb must be positive")
	}

	vm := &repository.VirtualMachine{
		ID:        repository.UUID(uuid.New().String()),
		LibvirtID: req.LibvirtID,
		Name:      req.Name,
		Hostname:  req.Hostname,
		VCPU:      req.VCPU,
		MemoryMB:  req.MemoryMB,
		DiskGB:    req.DiskGB,
		OSType:    req.OSType,
		PowerState: repository.PowerStateStopped,
		Metadata:  req.Metadata,
	}

	if vm.Metadata == nil {
		vm.Metadata = make(map[string]interface{})
	}

	if err := vs.vmRepo.Create(ctx, vm); err != nil {
		return nil, fmt.Errorf("failed to create VM: %w", err)
	}

	return vmToResponse(vm), nil
}

func (vs *VMService) GetVM(ctx context.Context, vmID string) (*VMResponse, error) {
	vm, err := vs.vmRepo.GetByID(ctx, repository.UUID(vmID))
	if err != nil {
		return nil, fmt.Errorf("failed to get VM: %w", err)
	}

	return vmToResponse(vm), nil
}

func (vs *VMService) GetVMByLibvirtID(ctx context.Context, libvirtID string) (*VMResponse, error) {
	vm, err := vs.vmRepo.GetByLibvirtID(ctx, libvirtID)
	if err != nil {
		return nil, fmt.Errorf("failed to get VM: %w", err)
	}

	return vmToResponse(vm), nil
}

type UpdateVMRequest struct {
	Name      string                 `json:"name"`
	Hostname  string                 `json:"hostname"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

func (vs *VMService) UpdateVM(ctx context.Context, vmID string, req *UpdateVMRequest) (*VMResponse, error) {
	vm, err := vs.vmRepo.GetByID(ctx, repository.UUID(vmID))
	if err != nil {
		return nil, fmt.Errorf("VM not found")
	}

	if req.Name != "" {
		vm.Name = req.Name
	}
	if req.Hostname != "" {
		vm.Hostname = req.Hostname
	}
	if req.Metadata != nil {
		vm.Metadata = req.Metadata
	}

	if err := vs.vmRepo.Update(ctx, vm); err != nil {
		return nil, fmt.Errorf("failed to update VM: %w", err)
	}

	return vmToResponse(vm), nil
}

func (vs *VMService) UpdatePowerState(ctx context.Context, vmID string, state string) (*VMResponse, error) {
	validStates := map[string]repository.PowerState{
		"running": repository.PowerStateRunning,
		"stopped": repository.PowerStateStopped,
		"paused":  repository.PowerStatePaused,
		"error":   repository.PowerStateError,
	}

	powerState, ok := validStates[state]
	if !ok {
		return nil, fmt.Errorf("invalid power state: %s", state)
	}

	if err := vs.vmRepo.UpdatePowerState(ctx, repository.UUID(vmID), powerState); err != nil {
		return nil, fmt.Errorf("failed to update power state: %w", err)
	}

	vm, err := vs.vmRepo.GetByID(ctx, repository.UUID(vmID))
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve VM: %w", err)
	}

	return vmToResponse(vm), nil
}

func (vs *VMService) DeleteVM(ctx context.Context, vmID string) error {
	if err := vs.vmRepo.Delete(ctx, repository.UUID(vmID)); err != nil {
		return fmt.Errorf("failed to delete VM: %w", err)
	}

	return nil
}

type ListVMsResponse struct {
	VMs        []*VMResponse `json:"vms"`
	Total      int           `json:"total"`
	Limit      int           `json:"limit"`
	Offset     int           `json:"offset"`
}

func (vs *VMService) ListVMs(ctx context.Context, limit, offset int) (*ListVMsResponse, error) {
	vms, err := vs.vmRepo.List(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list VMs: %w", err)
	}

	total, err := vs.vmRepo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count VMs: %w", err)
	}

	resp := &ListVMsResponse{
		VMs:    make([]*VMResponse, len(vms)),
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}

	for i, vm := range vms {
		resp.VMs[i] = vmToResponse(vm)
	}

	return resp, nil
}

func (vs *VMService) ListVMsByPowerState(ctx context.Context, state string) ([]*VMResponse, error) {
	validStates := map[string]repository.PowerState{
		"running": repository.PowerStateRunning,
		"stopped": repository.PowerStateStopped,
		"paused":  repository.PowerStatePaused,
		"error":   repository.PowerStateError,
	}

	powerState, ok := validStates[state]
	if !ok {
		return nil, fmt.Errorf("invalid power state: %s", state)
	}

	vms, err := vs.vmRepo.ListByPowerState(ctx, powerState)
	if err != nil {
		return nil, fmt.Errorf("failed to list VMs: %w", err)
	}

	resp := make([]*VMResponse, len(vms))
	for i, vm := range vms {
		resp[i] = vmToResponse(vm)
	}

	return resp, nil
}

func vmToResponse(vm *repository.VirtualMachine) *VMResponse {
	return &VMResponse{
		ID:              string(vm.ID),
		LibvirtID:       vm.LibvirtID,
		Name:            vm.Name,
		Hostname:        vm.Hostname,
		VCPU:            vm.VCPU,
		MemoryMB:        vm.MemoryMB,
		DiskGB:          vm.DiskGB,
		OSType:          vm.OSType,
		PowerState:      string(vm.PowerState),
		VNCPort:         vm.VNCPort,
		SPICEPort:       vm.SPICEPort,
		CreatedAt:       vm.CreatedAt,
		UpdatedAt:       vm.UpdatedAt,
		LastStateChange: vm.LastStateChange,
		Metadata:        vm.Metadata,
	}
}
