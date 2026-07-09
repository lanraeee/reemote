# Deployment & Operations

## Overview

Production deployment of Reemote involves containerization, orchestration, monitoring, and operational best practices.

## Docker Deployment

### Backend Container

Create `backend/Dockerfile`:

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o server ./backend/cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8443
CMD ["./server"]
```

Build and run:

```bash
# Build image
docker build -f backend/Dockerfile -t reemote-backend:latest .

# Run container
docker run -p 8443:8443 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=secure-password \
  -e JWT_SECRET=your-secret-key-here \
  -e ENCRYPTION_KEY=your-encryption-key \
  --network reemote-network \
  reemote-backend:latest
```

### Frontend Container

```dockerfile
# Already provided in frontend/Dockerfile
# Build and run:
docker build -f frontend/Dockerfile -t reemote-frontend:latest .

docker run -p 3000:3000 \
  -e VITE_API_URL=https://api.reemote.example.com/api/v1 \
  reemote-frontend:latest
```

### Docker Compose (Development & Testing)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: reemote
      POSTGRES_USER: reemote
      POSTGRES_PASSWORD: development-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "8443:8443"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: reemote
      DB_PASSWORD: development-password
      JWT_SECRET: dev-secret-32-character-string-here
      ENCRYPTION_KEY: dev-encryption-32-char-key-here
      LOG_LEVEL: debug
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8443/api/v1

volumes:
  postgres_data:
```

Run:
```bash
docker-compose up -d
```

## Kubernetes Deployment

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: reemote
```

### ConfigMap (Configuration)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: reemote-config
  namespace: reemote
data:
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  SECURITY_USER_RATELIMIT: "100"
  SECURITY_IP_RATELIMIT: "1000"
  SECURITY_RATELIMIT_WINDOW: "1m"
  DB_MAX_OPEN_CONNS: "20"
  DB_MAX_IDLE_CONNS: "5"
```

### Secret (Sensitive Data)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: reemote-secret
  namespace: reemote
type: Opaque
stringData:
  DB_PASSWORD: "your-secure-password"
  JWT_SECRET: "your-32-character-jwt-secret-key"
  ENCRYPTION_KEY: "your-32-character-encryption-key"
  TLS_CERT: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  TLS_KEY: |
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----
```

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reemote-backend
  namespace: reemote
spec:
  replicas: 3
  selector:
    matchLabels:
      app: reemote-backend
  template:
    metadata:
      labels:
        app: reemote-backend
    spec:
      containers:
      - name: backend
        image: reemote-backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8443
        
        envFrom:
        - configMapRef:
            name: reemote-config
        - secretRef:
            name: reemote-secret
        
        env:
        - name: DB_HOST
          value: postgres-service
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          value: reemote
        
        livenessProbe:
          httpGet:
            path: /health
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        
        readinessProbe:
          httpGet:
            path: /health
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 10
          periodSeconds: 5
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reemote-frontend
  namespace: reemote
spec:
  replicas: 2
  selector:
    matchLabels:
      app: reemote-frontend
  template:
    metadata:
      labels:
        app: reemote-frontend
    spec:
      containers:
      - name: frontend
        image: reemote-frontend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        
        env:
        - name: VITE_API_URL
          value: https://api.reemote.example.com/api/v1
        
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        
        resources:
          requests:
            memory: "128Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

### Services

```yaml
apiVersion: v1
kind: Service
metadata:
  name: reemote-backend-service
  namespace: reemote
spec:
  type: ClusterIP
  selector:
    app: reemote-backend
  ports:
  - protocol: TCP
    port: 8443
    targetPort: 8443

---
apiVersion: v1
kind: Service
metadata:
  name: reemote-frontend-service
  namespace: reemote
spec:
  type: ClusterIP
  selector:
    app: reemote-frontend
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
```

### Ingress (API Gateway)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: reemote-ingress
  namespace: reemote
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.reemote.example.com
    - reemote.example.com
    secretName: reemote-tls
  rules:
  - host: api.reemote.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: reemote-backend-service
            port:
              number: 8443
  - host: reemote.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: reemote-frontend-service
            port:
              number: 3000
```

Deploy:
```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secret.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/services.yaml
kubectl apply -f kubernetes/ingress.yaml
```

## Monitoring & Observability

### Structured Logging

All operations logged with structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "INFO",
  "message": "User login successful",
  "user_id": "user123",
  "email": "user@example.com",
  "ip_address": "192.168.1.1",
  "duration_ms": 45
}
```

**Log Levels:**
- DEBUG: Development/troubleshooting
- INFO: Normal operations
- WARN: Potential issues (certificate expiry soon, rate limits)
- ERROR: Failures requiring attention

### Metrics Collection

Prometheus metrics exposed on `/metrics` endpoint:

```
# Rate limiting
http_ratelimit_exceeded_total{user_id="user123"}
http_ratelimit_exceeded_total{ip="192.168.1.1"}

# Authentication
auth_login_attempts_total
auth_login_successes_total
auth_login_failures_total

# Console sessions
console_active_connections
console_frames_sent_total
console_bandwidth_bytes_total

# VM operations
vm_operations_total{operation="start"}
vm_state_changes_total

# Database
db_query_duration_seconds_bucket
db_connections_active
db_errors_total

# Libvirt
libvirt_operations_total
libvirt_circuit_breaker_state
```

### Log Aggregation Setup

**With Loki (Grafana stack):**

```yaml
# Promtail config (fluent-bit alternative)
clients:
  - url: http://loki:3100/loki/api/v1/push
scrape_configs:
  - job_name: reemote
    static_configs:
      - targets:
          - localhost
        labels:
          job: reemote
          __path__: /var/log/reemote/*.log
```

**With ELK Stack (Elasticsearch/Logstash/Kibana):**

```yaml
# Filebeat config
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/reemote/app.log
    json.message_key: message
    json.keys_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "reemote-%{+yyyy.MM.dd}"
```

### Alerting Rules

Example Prometheus alerts:

```yaml
groups:
  - name: reemote
    rules:
    - alert: HighRateLimit
      expr: |
        rate(http_ratelimit_exceeded_total[5m]) > 0.1
      for: 5m
      annotations:
        summary: "High rate limit violation rate"
    
    - alert: AuthenticationFailures
      expr: |
        rate(auth_login_failures_total[5m]) > 0.05
      for: 5m
      annotations:
        summary: "Elevated authentication failure rate"
    
    - alert: CertificateExpiringSoon
      expr: |
        days_until_expiry < 30
      annotations:
        summary: "SSL certificate expiring soon"
    
    - alert: LibvirtCircuitBreakerOpen
      expr: |
        libvirt_circuit_breaker_state == 1
      annotations:
        summary: "Libvirt circuit breaker is open"
    
    - alert: DatabaseConnectionPoolExhausted
      expr: |
        db_connections_active >= 20
      for: 5m
      annotations:
        summary: "Database connection pool nearly exhausted"
```

## Health Checks

### Liveness Probe
```bash
curl https://localhost:8443/health
# Returns 200 OK with {"status": "ok"}
```

### Readiness Probe
```bash
curl https://localhost:8443/health
# Same as liveness, indicates service is ready
```

### Dependency Check
Monitor:
- Database connectivity (connection pool health)
- Libvirt connectivity (circuit breaker state)
- TLS certificate validity
- Rate limiter state

## Backup & Recovery

### Database Backups

```bash
# Full backup
pg_dump -h postgres -U reemote reemote > backup.sql

# Restore
psql -h postgres -U reemote reemote < backup.sql

# Point-in-time recovery
pg_basebackup -h postgres -D /backup/base -Ft
```

### Configuration Backups

```bash
# Back up secrets and config
kubectl get secret reemote-secret -o yaml > secret-backup.yaml
kubectl get configmap reemote-config -o yaml > config-backup.yaml
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend to 5 replicas
kubectl scale deployment reemote-backend --replicas=5

# Scale frontend to 3 replicas
kubectl scale deployment reemote-frontend --replicas=3
```

### Resource Limits

Configured per deployment to prevent resource exhaustion:
- Backend: 512Mi memory, 500m CPU limit
- Frontend: 256Mi memory, 200m CPU limit
- Database: Based on expected load

### Auto-Scaling

Example Horizontal Pod Autoscaler:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: reemote-backend-hpa
  namespace: reemote
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: reemote-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Security in Production

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: reemote-network-policy
  namespace: reemote
spec:
  podSelector:
    matchLabels:
      app: reemote-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: reemote-frontend
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
```

### Secret Management

Use external secret managers:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

Example with Vault:

```bash
# Store secret
vault kv put secret/reemote/jwt_secret value=your-secret

# Retrieve in pod
$(vault kv get -field=value secret/reemote/jwt_secret)
```

## Performance Tuning

### Database Tuning

```sql
-- Connection pooling
SET shared_buffers = '256MB';
SET effective_cache_size = '1GB';
SET work_mem = '16MB';

-- Indexes on frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_vms_owner_id ON virtual_machines(owner_id);
CREATE INDEX idx_permissions_user_vm ON permissions(user_id, vm_id);
```

### Backend Tuning

```go
// Connection pool settings
MaxOpenConns: 20      // Limit concurrent connections
MaxIdleConns: 5       // Keep idle connections
ConnMaxLifetime: 5 * time.Minute  // Recycl old connections

// Rate limiter tuning
UserRateLimit:  100 req/min (adjust based on load)
IPRateLimit:    1000 req/min
WindowDuration: 1 minute
```

## Troubleshooting

### Common Issues

**Rate Limiting Too Strict:**
```bash
# Check current limits
echo $SECURITY_USER_RATELIMIT  # Should be 100
echo $SECURITY_IP_RATELIMIT    # Should be 1000

# Temporarily increase
kubectl set env deployment/reemote-backend \
  SECURITY_USER_RATELIMIT=1000 \
  SECURITY_IP_RATELIMIT=10000
```

**Database Connection Pool Exhausted:**
```bash
# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Increase pool size
kubectl set env deployment/reemote-backend \
  DB_MAX_OPEN_CONNS=40
```

**Libvirt Circuit Breaker Open:**
```bash
# Check logs for libvirt errors
kubectl logs -l app=reemote-backend | grep libvirt

# Verify libvirt service
virsh nodeinfo
```

## Maintenance Windows

Plan scheduled maintenance:

1. **Announce** in advance (24h notice)
2. **Drain** pods gracefully (`grace-period: 30s`)
3. **Perform** maintenance
4. **Verify** health checks
5. **Monitor** for issues

Example:

```bash
# Gracefully drain node
kubectl drain node-1 --grace-period=30s

# Perform maintenance
# ...

# Bring node back
kubectl uncordon node-1
```
