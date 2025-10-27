#!/bin/bash
# Automated Deployment with Database Setup
# Run this AFTER updating your Cloudflare API token with D1 permissions

echo "🚀 Kwikr Directory - Automated Deploy with Database"
echo "=================================================="

cd /home/user/webapp

echo "📦 Building application..."
npm run build

echo "🗄️ Applying database migrations to remote production..."
npx wrangler d1 migrations apply kwikr-directory-v2-production --remote --force

echo "📊 Adding essential worker data to remote database..."
npx wrangler d1 execute kwikr-directory-v2-production --remote --command="
-- HVAC Workers
INSERT OR IGNORE INTO users (id, first_name, last_name, email, phone, city, province, role, is_verified, is_active) VALUES
(7, 'Kevin', 'Brown', 'kevin.calgary@email.com', '403-555-0401', 'Calgary', 'AB', 'worker', 1, 1),
(10, 'Mark', 'Johnson', 'hvac.toronto@email.com', '416-555-0901', 'Toronto', 'ON', 'worker', 1, 1),
(11, 'Lisa', 'Anderson', 'hvac.vancouver@email.com', '604-555-0902', 'Vancouver', 'BC', 'worker', 1, 1);

INSERT OR IGNORE INTO user_profiles (user_id, bio) VALUES
(7, 'Heating and cooling systems specialist'),
(10, 'Commercial heating and cooling expert'),
(11, 'Residential heating and cooling services');

INSERT OR IGNORE INTO worker_services (user_id, service_name, service_category, description, hourly_rate, years_experience, is_available, service_area) VALUES
(7, 'Heating & Cooling', 'HVAC', 'Professional heating and cooling system installation and repair', 95.00, 8, 1, 'Greater Calgary Area'),
(10, 'Commercial HVAC', 'HVAC', 'Large-scale commercial heating and cooling systems', 105.00, 12, 1, 'Greater Toronto Area'),
(11, 'Residential HVAC', 'HVAC', 'Home heating and cooling system services', 90.00, 6, 1, 'Greater Vancouver Area');
"

echo "🚀 Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name kwikr-directory-v2

echo "✅ Deployment complete!"
echo "🌐 Your application is live at: https://kwikr-directory-v2.pages.dev"
echo ""
echo "🧪 Test your search:"
echo "1. Go to https://kwikr-directory-v2.pages.dev"
echo "2. Select 'HVAC Services'"
echo "3. Select 'AB' province"
echo "4. Select 'Calgary' city"
echo "5. Click 'Find Providers' - should find Kevin Brown ($95/hr)"
echo ""
echo "🎉 Full search functionality is now live!"