-- Basic seed data for Kwikr Directory Platform

-- Insert basic admin user first (using secure PBKDF2 hash)
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, province, city, is_verified, email_verified) VALUES 
  ('kwikradmin@getkwikr.com', 'MO*2880KwikrAdmin', 'admin', 'Kwikr', 'Admin', 'ON', 'Toronto', TRUE, TRUE);

-- Insert subscription plans
INSERT OR IGNORE INTO subscription_plans (plan_name, plan_slug, monthly_price, annual_price, description, is_active, created_at) VALUES 
  ('Pay-as-you-go', 'pay-as-you-go', 0.00, 0.00, 'Free tier with per-booking fees', 1, CURRENT_TIMESTAMP),
  ('Growth', 'growth', 99.00, 1080.00, 'Monthly plan for growing contractors', 1, CURRENT_TIMESTAMP),
  ('Pro', 'pro', 199.00, 2148.00, 'Premium plan for established contractors', 1, CURRENT_TIMESTAMP);

-- Insert sample job categories 
INSERT OR IGNORE INTO job_categories (name, description, requires_license, requires_insurance, icon_class) VALUES 
  ('Plumbing', 'Plumbing installation and repair', TRUE, TRUE, 'fas fa-wrench'),
  ('Electrical', 'Electrical installation and maintenance', TRUE, TRUE, 'fas fa-bolt'),
  ('Cleaning', 'Residential and commercial cleaning', FALSE, TRUE, 'fas fa-broom'),
  ('HVAC', 'Heating, ventilation, and air conditioning', TRUE, TRUE, 'fas fa-fan'),
  ('Landscaping', 'Lawn care and landscaping services', FALSE, TRUE, 'fas fa-seedling'),
  ('General Contracting', 'General construction and contracting work', TRUE, TRUE, 'fas fa-hard-hat'),
  ('Roofing', 'Roof installation and repair', TRUE, TRUE, 'fas fa-home'),
  ('Flooring', 'Flooring installation and refinishing', FALSE, TRUE, 'fas fa-layer-group');

-- Sample data inserted successfully