# Vercel Deployment Guide

Deploy Reemote to Vercel with Neon PostgreSQL in minutes.

## Overview

This deployment includes:
- **Frontend**: React SPA hosted on Vercel
- **Backend**: Serverless API routes (Node.js/TypeScript)
- **Database**: Neon PostgreSQL (managed)
- **Authentication**: JWT tokens
- **Auto-scaling**: Built-in with Vercel

## Prerequisites

- GitHub account with repo access
- Vercel account (free tier works)
- Neon account (free tier has 3 free projects)

## Step 1: Set Up Database (Neon)

### Create Neon Project

1. Go to [neon.tech](https://neon.tech)
2. Sign up or log in
3. Create a new project:
   - Name: `reemote`
   - Region: Choose closest to users
4. Copy the connection string (looks like: `postgresql://user:password@ep-xxx.neon.tech/reemote?sslmode=require`)

### Initialize Database Schema

```bash
# Install psql if needed
# macOS: brew install postgresql
# Linux: apt-get install postgresql-client
# Windows: https://www.postgresql.org/download/windows/

# Connect to Neon and run migrations
psql "postgresql://user:password@ep-xxx.neon.tech/reemote" < backend/migrations/001_create_tables.sql
psql "postgresql://user:password@ep-xxx.neon.tech/reemote" < backend/migrations/002_add_performance_indexes.sql
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Connect GitHub Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Select your GitHub repo `lanraeee/reemote`
   - Vercel auto-detects it's a monorepo with frontend

2. **Configure Build Settings**
   ```
   Framework: Vite
   Build Command: npm run build (in /frontend)
   Output Directory: frontend/dist
   Root Directory: frontend
   ```

3. **Add Environment Variables**
   ```
   DATABASE_URL: (from Neon)
   JWT_SECRET: (generate: openssl rand -base64 32)
   ENCRYPTION_KEY: (generate: openssl rand -base64 32)
   LOG_LEVEL: info
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# When prompted:
# - Set project name: reemote
# - Set root directory: frontend
# - Configure env vars when prompted

# Add secrets for production
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add ENCRYPTION_KEY

# Redeploy with env vars
vercel --prod
```

## Step 3: Configure Environment Variables

Set these in Vercel Dashboard (Settings → Environment Variables):

### Required

```
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/reemote?sslmode=require
JWT_SECRET=<your-32-char-secret>
ENCRYPTION_KEY=<your-32-char-secret>
```

### Optional

```
LOG_LEVEL=info
LIBVIRT_URI=qemu:///system (if using VM management)
SECURITY_USER_RATELIMIT=100
SECURITY_IP_RATELIMIT=1000
```

## Step 4: Generate Secrets

Generate strong secrets for JWT and encryption:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -base64 32

# Store these securely and add to Vercel
```

## Step 5: Verify Deployment

### Check Deployment Status

```bash
# Via Vercel CLI
vercel list
vercel inspect <project-id>

# Check health endpoint
curl https://your-project.vercel.app/api/health

# Response should be:
# {"status":"ok","timestamp":"...","database":"connected"}
```

### Test API Endpoints

```bash
# Register user
curl -X POST https://your-project.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User"
  }'

# Login
curl -X POST https://your-project.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# List VMs (requires auth token)
curl https://your-project.vercel.app/api/v1/vms \
  -H "Authorization: Bearer <token>"
```

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React SPA)    │ Deployed on Vercel
│   hosted on     │
│   Vercel CDN    │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────────────────────┐
│    Vercel Functions (API)       │
│  ├─ /api/v1/auth/register.ts    │
│  ├─ /api/v1/auth/login.ts       │
│  ├─ /api/v1/vms.ts             │
│  ├─ /api/health.ts              │
│  └─ ... (more endpoints)        │
└────────┬─────────────────────────┘
         │
         │ TCP/SSL
         │
┌────────▼──────────────┐
│  Neon PostgreSQL DB   │
│ (Managed Database)    │
└───────────────────────┘
```

## API Endpoints Available

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login

### Virtual Machines
- `GET /api/v1/vms` - List VMs
- `POST /api/v1/vms` - Create VM (admin only)
- `GET /api/v1/vms/:id` - Get VM details
- `PUT /api/v1/vms/:id` - Update VM
- `DELETE /api/v1/vms/:id` - Delete VM (admin only)

### Health & Status
- `GET /api/health` - Health check

## Frontend Configuration

The frontend automatically detects the API URL:

```typescript
// frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
```

This can be overridden with the `VITE_API_URL` environment variable:

```
VITE_API_URL=https://your-project.vercel.app/api/v1
```

## Performance & Scalability

### Vercel Advantages
- **Auto-scaling**: Automatically scales based on traffic
- **CDN**: Frontend served globally via edge network
- **Serverless**: Pay only for what you use
- **Zero cold starts**: With Vercel's infrastructure

### Database Performance
- **Neon**: Serverless PostgreSQL with autoscaling
- **Connection pooling**: Built-in via Neon's proxy
- **Backup**: Automatic daily backups included

### Monitoring

Vercel provides:
- **Deployment logs**: Real-time access to function logs
- **Error tracking**: Automatic error tracking
- **Analytics**: Traffic and performance analytics
- **Activity**: Git integration shows deployment history

## Updating Code

1. **Make changes locally**
   ```bash
   git add .
   git commit -m "feature: new functionality"
   git push origin main
   ```

2. **Vercel automatically deploys**
   - Triggered by push to main/production branch
   - Can be configured in Vercel dashboard
   - View deployment status in Vercel UI

3. **Rollback if needed**
   - Go to Vercel dashboard
   - Select previous deployment
   - Click "Redeploy"

## Troubleshooting

### Database Connection Issues

```
Error: ECONNREFUSED
```

**Solution:**
- Verify DATABASE_URL is correct in Vercel env vars
- Check Neon project is active
- Verify IP whitelist (Neon allows all IPs by default)
- Test connection locally:
  ```bash
  psql "$(echo $DATABASE_URL)"
  ```

### CORS Issues

If frontend can't reach API, check:
- API URLs match in frontend config
- CORS headers are set in API routes
- API routes are deployed (check Vercel logs)

### Function Timeout

If API calls timeout:
- Check database performance (Neon dashboard)
- Review function logs in Vercel
- Consider optimizing database queries
- Increase function timeout (up to 300s on Pro)

### Cold Start Latency

First request may take 1-3 seconds:
- This is normal for serverless functions
- Subsequent requests are faster
- Upgrade to Vercel Pro for better performance

## Cost Estimation

### Vercel
- **Free tier**: Up to 100 deployments/month, includes API routes
- **Pro**: $20/month per seat, unlimited deployments

### Neon
- **Free tier**: 3 projects, 0.5 vCPU shared, 3GB storage
- **Paid**: $0.150 per vCPU-hour, $0.15 per GB

### Typical Small Deployment
- **Vercel**: $0 (free tier) or $20/month (Pro)
- **Neon**: $0 (free tier) or ~$50/month (medium usage)
- **Total**: $0-70/month

## Production Checklist

Before going live:

- [ ] DATABASE_URL configured in Vercel
- [ ] JWT_SECRET configured (min 32 chars)
- [ ] ENCRYPTION_KEY configured (min 32 chars)
- [ ] Database migrations run
- [ ] Health check responds 200 OK
- [ ] Can login and access dashboard
- [ ] CORS configured for your domain
- [ ] Logging configured (default: info)
- [ ] Monitoring alerts set up (optional)
- [ ] SSL certificate valid (automatic with Vercel)

## Advanced Configuration

### Custom Domain

1. Add domain in Vercel dashboard
2. Update DNS records (Vercel provides instructions)
3. Configure frontend environment for new domain

### Environment-Specific Configuration

```
# Development
VITE_API_URL=http://localhost:3000/api/v1

# Production
VITE_API_URL=https://reemote.example.com/api/v1
```

### Rate Limiting

Configure in environment:
```
SECURITY_USER_RATELIMIT=100      # per minute per user
SECURITY_IP_RATELIMIT=1000       # per minute per IP
SECURITY_RATELIMIT_WINDOW=1m
```

### Logging

Set log level in environment:
```
LOG_LEVEL=debug    # verbose
LOG_LEVEL=info     # standard
LOG_LEVEL=warn     # warnings only
LOG_LEVEL=error    # errors only
```

## Next Steps

1. **Set up monitoring**
   - Enable Vercel analytics
   - Configure error notifications
   - Set up database monitoring in Neon

2. **Add more endpoints**
   - Console session management
   - Permission-based access
   - VM state management

3. **Optimize performance**
   - Add caching headers
   - Implement request deduplication
   - Optimize database indexes

4. **Scale infrastructure**
   - Add more database connections
   - Configure autoscaling policies
   - Add regional deployments

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **GitHub Issues**: Report issues in repository
- **Discord**: Join Vercel community for help
