# Vercel Deployment Quick Start

Deploy Reemote to Vercel with Neon PostgreSQL in 5 minutes.

## 1. Create Neon Database

```bash
# Go to https://neon.tech
# Create project "reemote"
# Copy connection string: postgresql://user:password@ep-xxx.neon.tech/reemote

# Initialize database
psql "postgresql://user:password@ep-xxx.neon.tech/reemote" < backend/migrations/001_create_tables.sql
psql "postgresql://user:password@ep-xxx.neon.tech/reemote" < backend/migrations/002_add_performance_indexes.sql
```

## 2. Generate Secrets

```bash
# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET"

# Generate ENCRYPTION_KEY
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
```

## 3. Deploy to Vercel

```bash
# Option A: Via Vercel Dashboard
# 1. Go to https://vercel.com
# 2. Import GitHub repository: lanraeee/reemote
# 3. Set root directory to: frontend
# 4. Add environment variables:
#    DATABASE_URL=postgresql://...
#    JWT_SECRET=...
#    ENCRYPTION_KEY=...
# 5. Click Deploy

# Option B: Via Vercel CLI
npm install -g vercel
vercel
# Follow prompts, add environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add ENCRYPTION_KEY
vercel --prod
```

## 4. Test Deployment

```bash
# Health check
curl https://your-project.vercel.app/api/health

# Expected response:
# {"status":"ok","timestamp":"...","database":"connected"}

# Register user
curl -X POST https://your-project.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User"
  }'
```

## 5. Access Dashboard

Open your browser and go to:
```
https://your-project.vercel.app
```

Login with:
- Email: test@example.com
- Password: TestPassword123!

## Troubleshooting

**Database connection error?**
- Verify DATABASE_URL in Vercel environment variables
- Check Neon project is running

**Frontend not loading?**
- Check build logs in Vercel dashboard
- Verify VITE_API_URL environment variable

**API not responding?**
- Check function logs in Vercel dashboard
- Verify all environment variables are set
- Run health check endpoint

## Next Steps

See [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for:
- Detailed configuration
- Custom domains
- Monitoring & scaling
- Production checklist
