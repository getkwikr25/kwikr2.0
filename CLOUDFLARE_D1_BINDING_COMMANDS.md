# Cloudflare D1 Database Binding Commands

## After updating API token permissions, run these commands:

### 1. List D1 databases to verify access
```bash
cd /home/user/webapp
CLOUDFLARE_API_TOKEN=WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU npx wrangler d1 list
```

### 2. Check if database exists, create if needed
```bash
CLOUDFLARE_API_TOKEN=WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU npx wrangler d1 create kwikr-directory-v2-production
```

### 3. Apply migrations to production database
```bash
CLOUDFLARE_API_TOKEN=WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU npx wrangler d1 migrations apply kwikr-directory-v2-production --remote
```

### 4. Bind database to Cloudflare Pages project
```bash
CLOUDFLARE_API_TOKEN=WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU npx wrangler pages project list
CLOUDFLARE_API_TOKEN=WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU npx wrangler pages deployment create --project-name kwikr-directory-v2
```

### 5. Set environment variables for Pages project
```bash
CLOUDFLARE_API_TOKEN=WXV7GWyhe_a9gM2lirNir9PrOWlrtm5qbgaYuWIU npx wrangler pages secret put DB_BINDING --project-name kwikr-directory-v2
```

## Database Configuration
- **Database Name**: kwikr-directory-v2-production
- **Database ID**: dc9e1f67-7237-4d65-bdb3-7145cadb45c8  
- **Binding Name**: DB
- **Pages Project**: kwikr-directory-v2

## Expected Results After Fix
- API endpoint `/api/client/search/stats` returns real data
- Console shows "Real worker data loaded" instead of "Failed to load real province data, using fallback"
- Province counts reflect actual database numbers (~1000+ workers)
- Cascade filtering works with real service distributions