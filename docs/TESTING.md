# Testing & Quality Assurance

## Overview

Comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests to ensure reliability and prevent regressions.

## Test Structure

```
backend/
├── internal/security/
│   ├── ratelimit_test.go      # Rate limiting unit tests
│   └── tls_test.go            # TLS/encryption unit tests
├── internal/auth/
│   └── *_test.go              # Auth service unit tests
└── tests/
    └── integration_test.go     # API integration tests

frontend/
├── tests/
│   └── e2e/
│       ├── auth.spec.ts       # Authentication E2E tests
│       └── dashboard.spec.ts  # Dashboard E2E tests
└── playwright.config.ts       # Playwright configuration
```

## Backend Testing

### Unit Tests

Test individual functions and components in isolation.

**Security Tests** (`backend/internal/security/`)

Rate limiting tests:
```bash
go test ./internal/security/ -v -run TestTokenBucket
go test ./internal/security/ -v -run TestRateLimiter
```

TLS/Encryption tests:
```bash
go test ./internal/security/ -v -run TestSessionEncryption
go test ./internal/security/ -v -run TestTLSManager
```

**Authentication Tests** (`backend/internal/auth/`)

```bash
go test ./internal/auth/ -v
```

Tests password validation, JWT tokens, TOTP verification, and token claims.

### Integration Tests

Test API endpoints with real HTTP server and middleware.

```bash
go test ./tests/ -v
```

Key integration tests:
- Rate limit middleware enforcement
- Login endpoint request handling
- Token validation
- Password validation
- Session encryption roundtrip
- Concurrent rate limiting

### Running All Backend Tests

```bash
# Run all tests with coverage
go test ./... -v -cover

# Generate coverage report
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Run only unit tests
go test ./internal/... -v -short

# Run integration tests
go test ./tests/... -v
```

### Test Coverage Goals

- **Core Services**: ≥80% coverage
  - User service
  - VM service
  - Permission service
  - Console manager

- **Security**: ≥90% coverage
  - Rate limiting
  - TLS management
  - Session encryption
  - JWT validation

- **Integration**: Key endpoints tested
  - Authentication flows
  - VM operations
  - Console connections

### Benchmarks

Performance tests ensure critical paths are fast:

```bash
# Run benchmarks
go test ./internal/security/ -bench=. -benchmem

# Example benchmarks
BenchmarkSessionEncryption_Encrypt
BenchmarkSessionEncryption_Decrypt
BenchmarkTokenBucket_AllowRequest
```

Expected performance:
- Session encryption: <2ms for encrypt/decrypt
- Rate limit check: <1ms
- Token validation: <5ms

## Frontend Testing

### Unit Tests (Jest)

Test React components, hooks, and utilities:

```bash
npm test -- --watch
npm test -- --coverage
```

Test areas:
- API service interceptors
- Auth store actions
- Component rendering
- Error handling

### End-to-End Tests (Playwright)

Test user flows across the application.

**Setup:**
```bash
npm install  # Installs Playwright
```

**Run tests:**
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.spec.ts

# Run tests in UI mode (interactive)
npm run test:e2e -- --ui

# Run tests in headed mode (see browser)
npm run test:e2e -- --headed
```

**E2E Test Suites:**

1. **Authentication** (`tests/e2e/auth.spec.ts`)
   - Login page displays correctly
   - Invalid credentials show errors
   - Protected routes redirect to login
   - TOTP field appears when required
   - Form validation works
   - Auth state persists across reload

2. **Dashboard** (`tests/e2e/dashboard.spec.ts`)
   - VM grid displays
   - Stats summary visible
   - VM cards show required info
   - Connect button disabled for stopped VMs
   - Connect button enabled for running VMs
   - Navigation works
   - Logout button visible

3. **Console** (planned)
   - Console connects successfully
   - Framebuffer renders
   - Keyboard/mouse events work
   - Statistics update
   - Disconnect works

### Test Reports

```bash
# Generate HTML coverage report
npm run test:e2e

# View report
open playwright-report/index.html
```

## Integration Testing

### Local Development Testing

1. **Start services:**
```bash
docker-compose up -d postgres
```

2. **Run backend:**
```bash
go run ./backend/cmd/server/main.go
```

3. **Run frontend:**
```bash
cd frontend && npm run dev
```

4. **Run integration tests:**
```bash
go test ./tests/ -v
```

### Database Testing

Test database operations with prepared test database:

```bash
# Run database migrations for tests
DATABASE_URL=postgres://test:test@localhost/reemote_test \
  go run ./backend/cmd/migrate/main.go up

# Run database tests
go test ./internal/repository/... -v
```

## CI/CD Integration

### GitHub Actions

The repository should have a `.github/workflows/test.yml` file:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
      - run: go test ./... -v
      
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:e2e
```

## Performance Testing

### Load Testing with Apache Bench

Test API endpoints under load:

```bash
# Test rate limiting
ab -n 100 -c 10 http://localhost:8443/api/v1/vms

# Expected: Many 429 (Too Many Requests) responses
```

### Load Testing with wrk

More sophisticated load testing:

```bash
# Install wrk
brew install wrk

# Test API endpoint
wrk -t4 -c100 -d30s http://localhost:8443/health
```

### Console Performance

Test VNC console with simulated traffic:

```bash
# Monitor bandwidth and frame rate
# Use ConsoleStats endpoint to verify metrics
curl http://localhost:8443/api/v1/console/session-id/stats
```

## Security Testing

### Static Analysis

```bash
# Go security checks
go install github.com/securego/gosec/v2/cmd/gosec@latest
gosec ./...

# Frontend security
npm audit
```

### OWASP Testing

Manual security testing checklist:

- [ ] SQL injection prevention (prepared statements)
- [ ] XSS prevention (input validation, output escaping)
- [ ] CSRF protection (token validation)
- [ ] Rate limiting effectiveness
- [ ] TLS/SSL validation
- [ ] Authentication bypass attempts
- [ ] Authorization enforcement
- [ ] Sensitive data exposure

## Debugging Tests

### Backend Test Debugging

```bash
# Run single test with verbose output
go test -v ./internal/security/ -run TestTokenBucket

# Run test with debugging
go test -v ./tests/ -run TestRateLimitMiddleware

# Debug with delve debugger
dlv test ./tests/ -- -test.run TestRateLimitMiddleware
```

### Frontend Test Debugging

```bash
# Debug in UI mode
npm run test:e2e -- --ui

# Debug in headed mode with slow-mo
npm run test:e2e -- --headed --headed-slowmo=1000

# View trace of failed test
npm run test:e2e -- --headed
# Then inspect in Playwright Inspector
```

## Best Practices

1. **Write tests alongside code** - Don't add tests after development
2. **Test behavior, not implementation** - Focus on what the code does, not how
3. **Use meaningful test names** - Name clearly describes what's being tested
4. **Keep tests fast** - Mock external dependencies
5. **Test edge cases** - Empty inputs, boundary values, errors
6. **Avoid test interdependence** - Each test should be independent
7. **Use test helpers** - Create utilities for common test setup
8. **Mock external services** - Don't call real APIs in tests
9. **Test error paths** - Verify error handling works correctly
10. **Review test coverage** - Identify and test uncovered code

## Continuous Integration

All tests must pass before merging:

1. Unit tests (backend)
2. Integration tests (backend)
3. E2E tests (frontend)
4. Static analysis (security)
5. Coverage requirements met

## Troubleshooting

### Flaky Tests

If a test fails intermittently:
- Check for race conditions (run with `-race` flag)
- Verify timing assumptions (use proper waits)
- Mock time-dependent code
- Check external service availability

### Test Timeout Issues

```bash
# Increase timeout for slow machines
go test ./... -timeout 30s

# Or set timeout per test
context.WithTimeout(ctx, 10*time.Second)
```

### Database Test Issues

```bash
# Ensure test database is clean
dropdb reemote_test
createdb reemote_test

# Or use test fixtures
go test ./tests/ -v -database-fixture=fresh
```

## Coverage Reports

View detailed coverage information:

```bash
# HTML coverage report
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Coverage by function
go tool cover -func=coverage.out | grep total

# Find uncovered code
go tool cover -html=coverage.out
# Look for red highlighted code
```

Expected coverage by package:
- `security`: 90%+
- `auth`: 85%+
- `service`: 80%+
- `repository`: 75%+
- `console`: 75%+
