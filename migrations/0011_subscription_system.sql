-- Comprehensive Worker Subscription System
-- Migration: 0011_subscription_system.sql
-- Purpose: Complete subscription management with plans, pricing, features, and grandfathering

-- Subscription Plans Table (Master plan definitions)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name VARCHAR(50) NOT NULL UNIQUE,
  plan_slug VARCHAR(50) NOT NULL UNIQUE,
  monthly_price DECIMAL(10,2) NOT NULL,
  annual_price DECIMAL(10,2) NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Plan Features (Configurable features for each plan)
CREATE TABLE IF NOT EXISTS subscription_plan_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  feature_name VARCHAR(200) NOT NULL,
  feature_value VARCHAR(500),
  feature_type VARCHAR(20) DEFAULT 'boolean', -- boolean, integer, string, decimal
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- Worker Subscriptions (Current active subscriptions)
CREATE TABLE IF NOT EXISTS worker_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  subscription_status VARCHAR(20) DEFAULT 'active', -- active, cancelled, suspended, expired, pending
  billing_cycle VARCHAR(10) DEFAULT 'monthly', -- monthly, annual
  current_monthly_price DECIMAL(10,2) NOT NULL,
  current_annual_price DECIMAL(10,2) NULL,
  grandfathered_pricing BOOLEAN DEFAULT 0,
  subscription_start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_period_end DATETIME NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT 0,
  cancelled_at DATETIME NULL,
  trial_end_date DATETIME NULL,
  payment_method VARCHAR(50) NULL,
  stripe_subscription_id VARCHAR(100) NULL,
  stripe_customer_id VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- Subscription History (Track all subscription changes)
CREATE TABLE IF NOT EXISTS subscription_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  old_plan_id INTEGER NULL,
  new_plan_id INTEGER NOT NULL,
  old_monthly_price DECIMAL(10,2) NULL,
  new_monthly_price DECIMAL(10,2) NOT NULL,
  change_type VARCHAR(30) NOT NULL, -- upgrade, downgrade, new, cancelled, reactivated, price_change
  change_reason TEXT NULL,
  effective_date DATETIME NOT NULL,
  grandfathered BOOLEAN DEFAULT 0,
  admin_user_id INTEGER NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (old_plan_id) REFERENCES subscription_plans(id),
  FOREIGN KEY (new_plan_id) REFERENCES subscription_plans(id),
  FOREIGN KEY (admin_user_id) REFERENCES users(id)
);

-- Price History for Grandfathering (Track price changes over time)
CREATE TABLE IF NOT EXISTS subscription_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  old_monthly_price DECIMAL(10,2) NULL,
  new_monthly_price DECIMAL(10,2) NOT NULL,
  old_annual_price DECIMAL(10,2) NULL,
  new_annual_price DECIMAL(10,2) NULL,
  change_effective_date DATETIME NOT NULL,
  grandfather_existing_users BOOLEAN DEFAULT 1,
  admin_user_id INTEGER NULL,
  change_notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_user_id) REFERENCES users(id)
);

-- Usage Analytics (Track plan feature usage)
CREATE TABLE IF NOT EXISTS subscription_usage_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  usage_month VARCHAR(7) NOT NULL, -- YYYY-MM format
  leads_generated INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  categories_used INTEGER DEFAULT 0,
  search_impressions INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  booking_requests INTEGER DEFAULT 0,
  revenue_generated DECIMAL(12,2) DEFAULT 0,
  platform_fees_paid DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  UNIQUE(user_id, usage_month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_subscriptions_user_id ON worker_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_subscriptions_status ON worker_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_worker_subscriptions_period_end ON worker_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_date ON subscription_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON subscription_plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_month ON subscription_usage_analytics(user_id, usage_month);

-- Insert the three subscription plans
INSERT OR IGNORE INTO subscription_plans (id, plan_name, plan_slug, monthly_price, annual_price, description, display_order) VALUES
(1, 'Pay-as-you-go', 'pay-as-you-go', 0.00, 0.00, 'Perfect for: New contractors, part-time workers, or anyone just testing the platform.', 3),
(2, 'Growth Plan', 'growth-plan', 99.00, 990.00, 'Perfect for: Contractors ready to grow and lower their cost per job.', 2),
(3, 'Pro Plan', 'pro-plan', 199.00, 1990.00, 'Perfect for: High-performing contractors who want to dominate local visibility and automate growth.', 1);

-- Insert Pay-as-you-go plan features
INSERT OR IGNORE INTO subscription_plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, display_order) VALUES
(1, 'search_tier', 'Search Results Tier', '3', 'integer', 1),
(1, 'categories_limit', 'Listed Categories', '1', 'integer', 2),
(1, 'per_booking_fee', 'Fee per Completed Booking', '2.00', 'decimal', 3),
(1, 'setup_cost', 'Setup Cost', '0.00', 'decimal', 4),
(1, 'booking_tools', 'Access to Booking Tools', '1', 'boolean', 5),
(1, 'lead_inbox', 'Lead Inbox Access', '1', 'boolean', 6),
(1, 'dashboard_access', 'Kwikr Dashboard Access', '1', 'boolean', 7),
(1, 'message_center', 'Message Center Access', '1', 'boolean', 8),
(1, 'cancel_anytime', 'Cancel Anytime', '1', 'boolean', 9),
(1, 'upgrade_anytime', 'Upgrade Anytime', '1', 'boolean', 10),
(1, 'revenue_percentage', 'Keep Revenue Percentage', '90', 'integer', 11),
(1, 'risk_free_entry', 'Risk-free Entry', '1', 'boolean', 12),
(1, 'upfront_cost', 'Zero Upfront Cost', '1', 'boolean', 13);

-- Insert Growth Plan features
INSERT OR IGNORE INTO subscription_plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, display_order) VALUES
(2, 'search_tier', 'Search Results Tier', '2', 'integer', 1),
(2, 'categories_limit', 'Listed Categories', '5', 'integer', 2),
(2, 'unlimited_leads', 'Unlimited Leads', '1', 'boolean', 3),
(2, 'per_job_fees', 'Per-job Fees', '0', 'boolean', 4),
(2, 'website_link_display', 'Display Website Link', '1', 'boolean', 5),
(2, 'phone_number_display', 'Display Phone Number', '1', 'boolean', 6),
(2, 'verified_pro_badge', 'Verified Pro Badge', '1', 'boolean', 7),
(2, 'booking_management_tools', 'Booking & Lead Management Tools', '1', 'boolean', 8),
(2, 'client_reminders', 'Reminders & Client Follow-ups', '1', 'boolean', 9),
(2, 'priority_support', 'Priority Support', '1', 'boolean', 10),
(2, 'revenue_percentage', 'Keep Job Revenue', '100', 'integer', 11);

-- Insert Pro Plan features
INSERT OR IGNORE INTO subscription_plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, display_order) VALUES
(3, 'search_tier', 'Search Results Tier', '1', 'integer', 1),
(3, 'featured_ribbon', 'Featured Ribbon', '1', 'boolean', 2),
(3, 'categories_limit', 'Listed Categories', '10', 'integer', 3),
(3, 'unlimited_leads', 'Unlimited Leads', '1', 'boolean', 4),
(3, 'per_job_fees', 'Per-job Fees', '0', 'boolean', 5),
(3, 'website_link_display', 'Display Website Link', '1', 'boolean', 6),
(3, 'phone_number_display', 'Display Phone Number', '1', 'boolean', 7),
(3, 'verified_pro_badge', 'Verified Pro Badge', '1', 'boolean', 8),
(3, 'kwikr_magazine_spotlight', 'Kwikr Magazine Spotlight', '1', 'boolean', 9),
(3, 'magazine_frequency', 'Magazine Spotlight Frequency', '1x/yr', 'string', 10),
(3, 'ai_website_chatbot', 'AI Website Chatbot Assistant', '1', 'boolean', 11),
(3, 'social_media_video_reels', 'Monthly Social Media Video Reels', '1', 'boolean', 12),
(3, 'video_reels_count', 'Video Reels Count', '2', 'integer', 13),
(3, 'video_reels_frequency', 'Video Reels Frequency', 'monthly', 'string', 14),
(3, 'early_access_tools', 'Early Access to New Tools & Features', '1', 'boolean', 15),
(3, 'premium_support', 'Premium Support', '1', 'boolean', 16),
(3, 'onboarding_support', '1:1 Onboarding', '1', 'boolean', 17),
(3, 'marketing_built_in', 'Top-tier Marketing Built In', '1', 'boolean', 18),
(3, 'revenue_percentage', 'Keep Job Revenue', '100', 'integer', 19);

-- Add subscription_plan_id to users table (if not exists)
-- ALTER TABLE users ADD COLUMN subscription_plan_id INTEGER DEFAULT 1;
-- ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active';

-- Update existing workers to have default Pay-as-you-go subscription
INSERT OR IGNORE INTO worker_subscriptions (
  user_id, 
  plan_id, 
  subscription_status, 
  current_monthly_price, 
  current_period_start,
  current_period_end
)
SELECT 
  u.id,
  1, -- Pay-as-you-go plan
  'active',
  0.00,
  CURRENT_TIMESTAMP,
  datetime(CURRENT_TIMESTAMP, '+1 month')
FROM users u 
WHERE u.role = 'worker' 
AND u.id NOT IN (SELECT user_id FROM worker_subscriptions);

PRAGMA foreign_keys = ON;