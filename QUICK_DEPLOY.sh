#!/bin/bash
# Quick Deploy Script for Kwikr Directory
# Run this AFTER setting up Cloudflare API key in Deploy tab

echo "🚀 Kwikr Directory - Quick Deploy to Production"
echo "================================================"

cd /home/user/webapp

echo "📦 Building application..."
npm run build

echo "🔑 Verifying Cloudflare authentication..."
npx wrangler whoami

echo "🗄️  Setting up production database..."
npx wrangler d1 migrations apply kwikr-directory-production

echo "📄 Creating Cloudflare Pages project..."
npx wrangler pages project create kwikr-directory --production-branch main --compatibility-date 2024-01-01

echo "🚀 Deploying to production..."
npx wrangler pages deploy dist --project-name kwikr-directory

echo "✅ Deployment complete!"
echo "Your application will be available at:"
echo "- Production: https://kwikr-directory.pages.dev"  
echo "- Branch: https://main.kwikr-directory.pages.dev"
echo ""
echo "🧪 Test your search functionality:"
echo "1. Go to the production URL"
echo "2. Select 'HVAC Services' as service type"
echo "3. Select 'AB' province" 
echo "4. Select 'Calgary' city"
echo "5. Click 'Find Providers' - should find Kevin Brown"