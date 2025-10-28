# URGENT: Database Setup Required

## Problem
The D1 database `kwikr-directory-v2-production` exists but is **completely empty** - no tables, no data.
This is why the API returns 500 errors and search shows fallback data.

## IMMEDIATE SOLUTION NEEDED

### Option 1: Update API Token Permissions (RECOMMENDED)
1. Go to **Cloudflare Dashboard** > **My Profile** > **API Tokens**
2. **Edit token**: `WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU`
3. **Add permissions**:
   - `Cloudflare D1:Edit`
   - `Account:Read` 
   - `Zone:Zone Settings:Read` (if needed)
4. **Save token**

### Option 2: Run These Commands After Token Update
```bash
cd /home/user/webapp

# Apply all migrations to create tables
CLOUDFLARE_API_TOKEN=WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU npx wrangler d1 migrations apply kwikr-directory-v2-production --remote

# Import the real 1000+ worker data
CLOUDFLARE_API_TOKEN=WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU npx wrangler d1 execute kwikr-directory-v2-production --remote --file=./migrations/0015_complete_kwikr_dataset_1002_businesses.sql
```

### Option 3: Manual Database Console (Alternative)
1. Go to **Cloudflare Dashboard** > **Storage & Databases** > **D1**
2. Click **kwikr-directory-v2-production**
3. Go to **Console** tab
4. **Run SQL** to create tables (I can provide the SQL)

## What Should Happen After Fix
- API endpoint returns real data: `{"provinces":[{"province":"ON","worker_count":350}...]}`
- Console shows: "Real worker data loaded" 
- Province counts reflect actual ~1000 workers
- Cascade search works with real service distributions

## Database Schema Needed
- `users` table with ~1000 worker records
- `worker_services` table with service categories
- Proper province/city distribution across Canada

The migration file `0015_complete_kwikr_dataset_1002_businesses.sql` contains all the real business data ready to import.