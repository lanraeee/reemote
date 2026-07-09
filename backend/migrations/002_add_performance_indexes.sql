-- Add additional indexes for query performance

-- Console sessions indexes
CREATE INDEX IF NOT EXISTS idx_console_sessions_active ON console_sessions(user_id, vm_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_console_sessions_date_range ON console_sessions(started_at, ended_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_status ON audit_log(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON audit_log(user_id, action);

-- Session tokens indexes
CREATE INDEX IF NOT EXISTS idx_session_tokens_active ON session_tokens(user_id) WHERE is_revoked = FALSE;

-- Permissions query optimization
CREATE INDEX IF NOT EXISTS idx_permissions_access_level ON permissions(access_level) WHERE deleted_at IS NULL;

-- Add constraint for valid power states
ALTER TABLE virtual_machines
ADD CONSTRAINT valid_power_state CHECK (power_state IN ('running', 'stopped', 'paused', 'error'));

-- Add constraint for valid audit statuses
ALTER TABLE audit_log
ADD CONSTRAINT valid_audit_status CHECK (status IN ('success', 'failure'));
