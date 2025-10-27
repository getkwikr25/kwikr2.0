# 🚀 Kwikr Directory - Production Deployment Guide

## Prerequisites ✅
- Cloudflare API key configured (via Deploy tab)
- GitHub repository: `getkwikr25/getkwikr-platform2`
- Project name: `kwikr-directory`
- Database: `kwikr-directory-production`

## Step 1: Setup Cloudflare Authentication
```bash
# This should be done after configuring API key in Deploy tab
cd /home/user/webapp
npx wrangler whoami  # Verify authentication
```

## Step 2: Create Production Database (if not exists)
```bash
# Create production database (may already exist)
npx wrangler d1 create kwikr-directory-production

# Apply database migrations to production
npx wrangler d1 migrations apply kwikr-directory-production
```

## Step 3: Build and Test Locally
```bash
# Build the application
npm run build

# Test locally (optional)
npx wrangler pages dev dist --d1=kwikr-directory-production --local
```

## Step 4: Create Cloudflare Pages Project
```bash
# Create the Pages project (use 'main' branch as production branch)
npx wrangler pages project create kwikr-directory \
  --production-branch main \
  --compatibility-date 2024-01-01
```

## Step 5: Deploy to Production
```bash
# Deploy the application
npx wrangler pages deploy dist --project-name kwikr-directory
```

## Step 6: Verify Deployment
After deployment, you'll receive URLs like:
- **Production**: `https://random-id.kwikr-directory.pages.dev`
- **Branch**: `https://main.kwikr-directory.pages.dev`

Test these URLs to ensure:
- ✅ Homepage loads
- ✅ Search functionality works
- ✅ Service filtering works (HVAC Services)
- ✅ Province/city filtering works
- ✅ Database connectivity works

## Step 7: Custom Domain (Optional)
```bash
# Add custom domain if you have one
npx wrangler pages domain add yourdomain.com --project-name kwikr-directory
```

## Step 8: Environment Variables (if needed)
```bash
# Add secrets for production
npx wrangler pages secret put API_KEY --project-name kwikr-directory
npx wrangler pages secret put OTHER_SECRET --project-name kwikr-directory

# List all secrets
npx wrangler pages secret list --project-name kwikr-directory
```

## Troubleshooting 🔧

### If Database Migration Fails:
```bash
# Check existing databases
npx wrangler d1 list

# Check migration status
npx wrangler d1 migrations list kwikr-directory-production

# Force apply migrations
npx wrangler d1 migrations apply kwikr-directory-production --force
```

### If Project Name Conflicts:
```bash
# Use a different project name
npx wrangler pages project create kwikr-directory-2 --production-branch main
npx wrangler pages deploy dist --project-name kwikr-directory-2
```

### If Deployment Fails:
```bash
# Check build output
ls -la dist/

# Verify wrangler configuration
cat wrangler.jsonc

# Check authentication
npx wrangler whoami
```

## Project Structure ✅
```
webapp/
├── src/
│   ├── index.tsx          # Main application
│   └── routes/            # API routes
├── public/
│   └── static/            # Static assets
├── dist/                  # Built application (auto-generated)
├── migrations/            # Database migrations
├── wrangler.jsonc         # Cloudflare configuration
└── package.json           # Dependencies
```

## Key Features Deployed ✅
- ✅ Main search functionality (FIXED)
- ✅ Service type filtering (HVAC, Plumbing, etc.)
- ✅ Province/city filtering with real counts
- ✅ Worker profiles and listings
- ✅ Database integration (D1 SQLite)
- ✅ Real Canadian worker data (943 workers)

## Database Data ✅
The production database includes:
- 943 workers across Canadian provinces
- Real service categories (HVAC, Plumbing, Electrical, etc.)
- Authentic location data (Calgary, Vancouver, Toronto, etc.)
- Working search and filtering functionality

## Support URLs
- **Development**: https://3000-il89rmlurnxheu701hcp8-6532622b.e2b.dev
- **Production**: (Available after deployment)
- **GitHub**: https://github.com/getkwikr25/getkwikr-platform2

---

## Quick Deploy (TL;DR) ⚡
```bash
cd /home/user/webapp
npm run build
npx wrangler pages project create kwikr-directory --production-branch main
npx wrangler pages deploy dist --project-name kwikr-directory
```

**Note**: Ensure Cloudflare API key is configured via Deploy tab before running these commands.