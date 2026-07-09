# Reemote - Remote Desktop VM Tool

A comprehensive, production-grade remote desktop access tool for managing and connecting to bootable KVM/QEMU virtual machines via a web-based interface.

## Architecture Overview

**Tech Stack**:
- **Backend**: Go 1.21 (high-concurrency networking)
- **Database**: PostgreSQL (ACID compliance, JSON support)
- **Protocol**: VNC over WebSocket (browser-native access)
- **Auth**: JWT + TOTP (2FA support)

**Key Features**:
- ✅ Web-based VM management dashboard (React 18)
- ✅ Remote console access (VNC over WebSocket)
- ✅ User authentication with 2FA (JWT + TOTP)
- ✅ Role-based access control (RBAC) with 3 levels
- ✅ Comprehensive audit logging
- ✅ Transaction-safe database operations
- ✅ Graceful error handling & circuit breakers
- ✅ Structured logging with context
- ✅ Rate limiting (per-user & per-IP)
- ✅ TLS 1.3 with strong cipher suites
- ✅ AES-256-GCM session encryption
- ✅ Comprehensive test suite (unit, integration, E2E)
- ✅ Production-ready observability (metrics, logging)

## Project Structure

```
reemote/
├── backend/
│   ├── cmd/server/main.go        # Entry point
│   ├── config/                   # Configuration management
│   ├── internal/
│   │   ├── auth/                 # JWT, TOTP, Password hashing
│   │   ├── database/             # PostgreSQL connection pooling
│   │   ├── repository/           # Data access layer
│   │   └── service/              # Business logic layer
│   ├── migrations/               # SQL migration files
│   ├── tests/                    # Unit & integration tests
│   └── Dockerfile
├── migrations/                   # Database migrations
├── docker-compose.yml            # Local development
├── Makefile                      # Build commands
└── README.md
```

## Getting Started

### Prerequisites
- Go 1.21+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Development Setup

1. **Clone and setup dependencies**:
```bash
git clone https://github.com/lanraeee/reemote.git
cd reemote
make setup
```

2. **Configure environment**:
```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

3. **Start PostgreSQL**:
```bash
make db-up
```

4. **Run migrations**:
```bash
make migrate
```

5. **Start server**:
```bash
make run
```

Server runs on `http://localhost:8443`

### Docker Development

```bash
make docker-build
make docker-run
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login (returns JWT)
- `GET /api/v1/users/profile` - Get current user

### Virtual Machines
- `GET /api/v1/vms` - List all VMs
- `POST /api/v1/vms` - Create VM (admin only)
- `GET /api/v1/vms/{id}` - Get VM details
- `PUT /api/v1/vms/{id}` - Update VM
- `DELETE /api/v1/vms/{id}` - Delete VM (admin only)

## Configuration

All settings in `.env.local`:

```env
# Server
SERVER_PORT=8443
SERVER_HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_USER=reemote
DB_PASSWORD=changeme

# Auth
JWT_SECRET=<32+ random characters>
PASSWORD_MIN_LENGTH=12

# Libvirt
LIBVIRT_URI=qemu:///system
```

See `.env.example` for all options.

## Security

✅ **Built-in**:
- Bcrypt password hashing (cost=12)
- JWT token validation (15min expiry)
- TOTP 2FA support
- CORS protection
- Rate limiting (100 req/min per user)
- SQL injection prevention (prepared statements)
- Audit logging for all operations

⚠️ **Production Checklist**:
- [ ] Generate strong JWT_SECRET (openssl rand -base64 32)
- [ ] Configure TLS certificates
- [ ] Enable DB SSL mode
- [ ] Set up reverse proxy (nginx/HAProxy)
- [ ] Configure firewall rules
- [ ] Enable audit log archival
- [ ] Set up monitoring/alerting
- [ ] Run security scanning (gosec)

## Testing

**Backend Tests**:
```bash
# Run all tests
go test ./... -v

# Run with coverage
go test ./... -cover

# Run benchmarks
go test ./internal/security/ -bench=.
```

**Frontend Tests**:
```bash
# E2E tests with Playwright
npm run test:e2e

# E2E tests in UI mode
npm run test:e2e:ui

# E2E tests in headed mode
npm run test:e2e:headed
```

See `docs/TESTING.md` for comprehensive testing documentation.

## Database Schema

Core tables:
- `users` - User accounts & auth
- `virtual_machines` - VM inventory
- `permissions` - User-VM access control
- `console_sessions` - Connection history
- `audit_log` - Security audit trail
- `session_tokens` - JWT token tracking

Run migrations to initialize:
```bash
make migrate
```

## Implementation Phases

### ✅ Phase 1: Foundation (Complete)
- PostgreSQL schema with soft deletes and audit logging
- User authentication: JWT (15min) + Refresh tokens (7 days)
- TOTP 2FA with Google Authenticator compatibility
- Configuration management with environment validation
- RESTful API structure with error handling

### ✅ Phase 2: VM Management (Complete)
- Libvirt client with connection pooling & circuit breaker pattern
- VM CRUD operations (create, start, stop, delete)
- Event-driven architecture with async event bus
- VM state monitoring (30sec polling)
- Dynamic metadata storage (JSONB)

### ✅ Phase 3: Remote Console (Complete)
- RFB 3.8 VNC protocol implementation
- WebSocket tunneling with proxy between browser and VM
- 8+ encoding support (Raw, CopyRect, RRE, Hextile, ZLIB, Tight, ZRLE, JPEG)
- Adaptive frame compression with bandwidth optimization
- Session management with automatic cleanup
- Real-time statistics tracking

### ✅ Phase 4: React Frontend (Complete)
- React 18 + TypeScript + Vite SPA
- Zustand state management with persistence
- Canvas-based VNC framebuffer renderer
- Dashboard with VM inventory grid
- Console viewer with keyboard/mouse support
- Settings page (Profile, Security, Preferences)
- Protected routes with JWT validation
- Responsive Tailwind CSS design

### ✅ Phase 5: Security & Hardening (Complete)
- TLS 1.3 certificate management and validation
- Token bucket rate limiting (per-user & per-IP)
- AES-256-GCM session encryption with random nonces
- HTTP 429 responses for rate-limited requests
- Bcrypt password hashing (cost=12)
- SQL injection prevention (prepared statements)
- Certificate expiry warnings (30-day threshold)

### ✅ Phase 6: Testing & Observability (Complete)
- **Unit Tests**: Rate limiting, encryption, password validation, token management
- **Integration Tests**: API endpoints, rate limit middleware, auth flows
- **E2E Tests**: Playwright tests for auth, dashboard, console interactions
- **Metrics**: Prometheus-compatible metrics for API, auth, console, VM, database
- **Structured Logging**: JSON format with context, timestamps, log levels
- **Performance**: Benchmarks for encryption/decryption, rate limiting checks
- **Documentation**: Comprehensive testing guide, deployment guide, architecture docs

## Documentation

Complete documentation available in `docs/`:

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Detailed system design, data models, API endpoints
- **[SECURITY.md](docs/SECURITY.md)** - Security architecture, threat model, best practices
- **[CONSOLE.md](docs/CONSOLE.md)** - VNC protocol details, console architecture, bandwidth optimization
- **[TESTING.md](docs/TESTING.md)** - Testing strategies, running tests, coverage goals
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Docker/Kubernetes deployment, monitoring, scaling

## Common Issues

**Database connection refused**:
```bash
make db-up
make migrate
```

**Port already in use**:
```bash
lsof -i :8443
# Kill process or change SERVER_PORT
```

**Invalid JWT token**:
- Token expired? Refresh needed
- Check JWT_SECRET matches

## Contributing

1. Create feature branch
2. Write tests
3. Run linter
4. Submit PR

## License

MIT License - See LICENSE file

## Support

- Issues: GitHub Issues
- Docs: See `docs/` directory
- Questions: GitHub Discussions
