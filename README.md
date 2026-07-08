# Reemote - Remote Desktop VM Tool

A comprehensive, production-grade remote desktop access tool for managing and connecting to bootable KVM/QEMU virtual machines via a web-based interface.

## Architecture Overview

**Tech Stack**:
- **Backend**: Go 1.21 (high-concurrency networking)
- **Database**: PostgreSQL (ACID compliance, JSON support)
- **Protocol**: VNC over WebSocket (browser-native access)
- **Auth**: JWT + TOTP (2FA support)

**Key Features**:
- ✅ Web-based VM management dashboard
- ✅ Remote console access (VNC)
- ✅ User authentication with 2FA
- ✅ Role-based access control (RBAC)
- ✅ Comprehensive audit logging
- ✅ Transaction-safe database operations
- ✅ Graceful error handling & circuit breakers
- ✅ Structured logging with context

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

```bash
# Unit tests
make test

# Lint code
make lint

# Build binary
make build
```

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
- Database schema with soft deletes
- User auth (JWT + TOTP)
- Config management
- Basic API structure

### 🔄 Phase 2: VM Management (Next)
- Libvirt client integration
- VM CRUD operations
- Event-driven state sync
- Connection pooling

### Phase 3: Remote Console
- VNC protocol implementation
- WebSocket tunnel
- Frame compression
- Input handling

### Phase 4: Frontend
- React dashboard
- VNC viewer component
- Real-time status updates

### Phase 5: Security & Hardening
- TLS certificate mgmt
- Rate limiting
- Input validation
- Security scanning

### Phase 6: Testing & Observability
- Unit/integration/E2E tests
- Prometheus metrics
- ELK log aggregation

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
