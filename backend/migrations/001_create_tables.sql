-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    totp_secret VARCHAR(32),
    totp_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE deleted_at IS NULL;

-- Virtual Machines table
CREATE TABLE virtual_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libvirt_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255),
    vcpu INT NOT NULL CHECK (vcpu > 0),
    memory_mb INT NOT NULL CHECK (memory_mb > 0),
    disk_gb INT NOT NULL CHECK (disk_gb > 0),
    os_type VARCHAR(50) NOT NULL,
    power_state VARCHAR(50) NOT NULL DEFAULT 'stopped',
    vnc_port INT,
    spice_port INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_state_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    deleted_at TIMESTAMP
);

CREATE INDEX idx_vms_libvirt_id ON virtual_machines(libvirt_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vms_power_state ON virtual_machines(power_state) WHERE deleted_at IS NULL;
CREATE INDEX idx_vms_created_at ON virtual_machines(created_at);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vm_id UUID NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    access_level VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    expires_at TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT valid_access_level CHECK (access_level IN ('view', 'control', 'admin')),
    UNIQUE(user_id, vm_id) WHERE deleted_at IS NULL
);

CREATE INDEX idx_permissions_user_id ON permissions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_permissions_vm_id ON permissions(vm_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_permissions_expires_at ON permissions(expires_at) WHERE deleted_at IS NULL;

-- Console Sessions table
CREATE TABLE console_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vm_id UUID NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    protocol VARCHAR(50) NOT NULL,
    client_ip VARCHAR(45),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    bandwidth_used_mb INT DEFAULT 0,
    frame_count INT DEFAULT 0,
    errors INT DEFAULT 0,
    CONSTRAINT valid_protocol CHECK (protocol IN ('vnc', 'spice', 'webrtc'))
);

CREATE INDEX idx_console_sessions_user_id ON console_sessions(user_id);
CREATE INDEX idx_console_sessions_vm_id ON console_sessions(vm_id);
CREATE INDEX idx_console_sessions_started_at ON console_sessions(started_at);

-- Audit Log table (partitioned by month)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    error_msg TEXT,
    client_ip VARCHAR(45),
    user_agent VARCHAR(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (CAST(DATE_TRUNC('month', timestamp) AS DATE));

-- Create initial partition for current month
CREATE TABLE audit_log_2024_01 PARTITION OF audit_log
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource_id ON audit_log(resource_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Session Tokens table (for refresh tokens)
CREATE TABLE session_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500)
);

CREATE INDEX idx_session_tokens_user_id ON session_tokens(user_id);
CREATE INDEX idx_session_tokens_expires_at ON session_tokens(expires_at);
CREATE INDEX idx_session_tokens_is_revoked ON session_tokens(is_revoked);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_vms_timestamp
    BEFORE UPDATE ON virtual_machines
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
