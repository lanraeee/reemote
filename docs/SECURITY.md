# Security Architecture

## Overview

Reemote implements defense-in-depth security with multiple layers of protection:
- Cryptographic authentication (JWT + TOTP 2FA)
- TLS 1.3 with strong cipher suites
- Rate limiting (per-user and per-IP)
- Session encryption with AES-256-GCM
- Role-based access control (RBAC)

## Authentication & Authorization

### JWT Token Management
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens signed with HS256 algorithm
- JWT secret must be ≥32 characters (enforced at startup)
- Token validation on every protected endpoint

### TOTP 2FA (Time-based One-Time Password)
- Compatible with Google Authenticator
- 30-second time window with ±1 window tolerance
- Optional but recommended for admin accounts
- Enforced for privileged operations

### Password Requirements
- Minimum 12 characters
- Must contain: uppercase, lowercase, digit, special character
- Hashed with bcrypt (cost factor: 12)
- Never stored in plaintext
- Password changes invalidate existing sessions

### Role-Based Access Control
Three access levels for VM console:
1. **view**: Read-only access, cannot control VM
2. **control**: Can start/stop/reboot VMs
3. **admin**: Full access including user management

## Rate Limiting

Implemented via token bucket algorithm with per-user and per-IP buckets:

```
UserRateLimit:      100 requests/minute per user
IPRateLimit:        1000 requests/minute per IP
RateLimitWindow:    1 minute (refill period)
```

### Implementation Details
- Tokens refill continuously based on elapsed time
- Bucket capacity equals max requests per window
- Refill rate = maxRequests / window.Seconds()
- Automatic cleanup of stale buckets (every 5 minutes)
- Old buckets removed after 1 hour of inactivity

### Response Handling
- Rate-limited requests return HTTP 429 (Too Many Requests)
- Error message indicates limiting by user or IP
- Applied to all API endpoints including console sessions

## TLS/SSL Configuration

### Cipher Suites (TLS 1.3 Only)
1. TLS_AES_256_GCM_SHA384 (preferred)
2. TLS_CHACHA20_POLY1305_SHA256 (fallback)
3. TLS_AES_128_GCM_SHA256 (fallback)

### Elliptic Curves
1. P-256 (NIST)
2. X25519 (modern, faster)

### Certificate Management
- X.509 certificates loaded at startup
- Expiry date checked every server start
- Warning threshold: 30 days (configurable)
- SessionTicketsDisabled: false (for performance)

```go
// TLSManager loads certificates and configures TLS
tlsManager := security.NewTLSManager(certFile, keyFile)
if err := tlsManager.LoadCertificates(); err != nil {
    log.Fatal(err)
}

// Check expiry
if expiry, ok := tlsManager.CheckCertificateExpiry(30); !ok {
    log.Printf("Warning: %s", expiry)
}
```

## Session Encryption

### AES-256-GCM Encryption
Used for encrypting sensitive session tokens in transit/storage:

- **Algorithm**: AES-256 in GCM mode
- **Key Size**: 256 bits (32 bytes)
- **Nonce**: 12 bytes, randomly generated per encryption
- **Authentication**: GCM provides authenticated encryption
- **Encoding**: Base64 for transport

### Implementation
```go
// Encrypt session token
sessionEnc := security.NewSessionEncryption(encryptionKey)
encrypted, err := sessionEnc.EncryptSessionToken(token)

// Decrypt session token
plaintext, err := sessionEnc.DecryptSessionToken(encrypted)
```

### Security Properties
- Each encryption generates a new random nonce
- Tampering detected via authentication tag
- Decryption fails if tag doesn't match
- No plaintext recovery without correct key

## Console Security

### WebSocket Authentication
- All console connections require valid JWT token
- Permission check enforces RBAC before connecting
- Session tokens bound to specific user+VM pair
- Automatic cleanup after 30 minutes inactivity

### VNC Protocol Security
- Running over WebSocket (can be TLS-encrypted)
- Frame compression reduces bandwidth
- Bandwidth optimization adapts to network conditions
- Session statistics tracked: bytes sent/received, frame count

## Database Security

### SQL Injection Prevention
- Prepared statements for all queries
- Parameterized inputs throughout
- No string concatenation in SQL

### Data Protection
- Passwords hashed with bcrypt (never stored plaintext)
- Sensitive fields encrypted where applicable
- Audit log records all privileged operations
- Soft deletes maintain data integrity

### Connection Security
- Connection pooling prevents resource exhaustion
- SSL mode required for PostgreSQL connections
- Max lifetime 5 minutes, idle timeout configurable

## Libvirt Integration Security

### Circuit Breaker Pattern
Prevents cascading failures from libvirt timeouts:

```
CircuitBreakerLimit: 5 consecutive failures to open circuit
CircuitBreakerReset: 30 seconds in half-open state
ConnectionTimeout:   30 seconds per operation
```

States:
1. **Closed**: Normal operation, pass requests through
2. **Open**: Fail fast, don't attempt connections (after 5 failures)
3. **Half-Open**: Test if service recovered (30 sec timeout)

## Configuration

### Environment Variables
```
# Rate Limiting
SECURITY_USER_RATELIMIT=100          # per minute
SECURITY_IP_RATELIMIT=1000           # per minute
SECURITY_RATELIMIT_WINDOW=1m         # duration

# TLS/Certificates
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem
CERT_EXPIRY_WARNING_DAYS=30

# Session Encryption
ENCRYPTION_KEY=<32-char-minimum-key>

# Authentication
JWT_SECRET=<32-char-minimum-secret>
BCRYPT_COST=12
PASSWORD_MIN_LENGTH=12
TOTP_WINDOW_SIZE=1

# Libvirt Circuit Breaker
LIBVIRT_CIRCUIT_LIMIT=5
LIBVIRT_CIRCUIT_RESET=30s
LIBVIRT_TIMEOUT=30s
```

## Security Checklist

### Pre-Deployment
- [ ] Generate strong JWT_SECRET (≥32 characters, cryptographically random)
- [ ] Generate strong ENCRYPTION_KEY (≥32 characters)
- [ ] Obtain valid TLS certificate from CA (not self-signed in production)
- [ ] Set REQUIRE_TLS=true in production
- [ ] Configure ALLOWED_CORS_ORIGINS for frontend domain
- [ ] Use strong database password
- [ ] Enable database SSL/TLS connections

### Post-Deployment
- [ ] Monitor rate limit logs for attacks
- [ ] Check certificate expiry regularly (alerting recommended)
- [ ] Review audit logs for privileged operations
- [ ] Rotate encryption keys annually
- [ ] Monitor libvirt circuit breaker state for reliability issues

## Threat Model & Mitigations

| Threat | Mitigation |
|--------|-----------|
| Brute force login | Rate limiting + TOTP 2FA |
| Unauthorized console access | JWT validation + RBAC + Permission checks |
| Session hijacking | Short-lived tokens + HTTPS only |
| Man-in-the-middle | TLS 1.3 + strong cipher suites |
| Tampering with data | TLS authentication + session encryption |
| Denial of service | Rate limiting + circuit breaker |
| SQL injection | Prepared statements + parameterization |
| Privilege escalation | RBAC enforcement + audit logging |

## Testing & Validation

### Unit Tests
```bash
go test ./internal/security/... -v
go test ./internal/auth/... -v
```

### Integration Tests
- Rate limit middleware behavior
- TLS configuration loading
- Session encryption/decryption roundtrip
- JWT token validation and expiry
- TOTP validation with time window

### Security Audit Points
- Verify TLS 1.3 enforcement
- Check cipher suite order
- Validate rate limit bucket behavior
- Test session encryption key derivation
- Verify RBAC enforcement on console access

## Best Practices

1. **Always use HTTPS in production** - Set TLS_CERT_PATH and TLS_KEY_PATH
2. **Rotate secrets regularly** - Implement key rotation for JWT_SECRET and ENCRYPTION_KEY
3. **Monitor rate limits** - Alert on sustained 429 responses
4. **Review audit logs** - Track privileged operations
5. **Keep dependencies updated** - Regular security patches for Go libraries
6. **Enable 2FA for admins** - Enforce TOTP for administrative accounts
7. **Implement rate limit exceptions** - For trusted internal services
8. **Use strong passwords** - Enforce minimum requirements
9. **Disable session tickets in high-security environments** - Uncomment SessionTicketsDisabled in TLSManager
10. **Regular certificate renewal** - Alert 30+ days before expiry
