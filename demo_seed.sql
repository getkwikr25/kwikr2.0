-- Demo Seed data for Kwikr Directory Platform with Testing Categories

-- Insert updated job categories (12 trade categories)
INSERT OR IGNORE INTO job_categories (name, description, requires_license, requires_insurance, icon_class) VALUES 
  ('Cleaning Services', 'Residential and commercial cleaning services', FALSE, TRUE, 'fas fa-broom'),
  ('Plumbers', 'Plumbing installation, repair, and maintenance', TRUE, TRUE, 'fas fa-wrench'),
  ('Carpenters', 'Custom carpentry, woodwork, and furniture', FALSE, TRUE, 'fas fa-hammer'),
  ('Electricians', 'Electrical installation, wiring, and maintenance', TRUE, TRUE, 'fas fa-bolt'),
  ('Flooring', 'Flooring installation, refinishing, and repair', FALSE, TRUE, 'fas fa-layer-group'),
  ('Painters', 'Interior and exterior painting services', FALSE, TRUE, 'fas fa-paint-roller'),
  ('Handyman', 'General maintenance, repairs, and odd jobs', FALSE, TRUE, 'fas fa-tools'),
  ('HVAC Services', 'Heating, ventilation, and air conditioning', TRUE, TRUE, 'fas fa-fan'),
  ('General Contractor', 'General construction and building projects', TRUE, TRUE, 'fas fa-hard-hat'),
  ('Roofing', 'Roof installation, repair, and maintenance', TRUE, TRUE, 'fas fa-home'),
  ('Landscaping', 'Lawn care, gardening, and outdoor design', FALSE, TRUE, 'fas fa-seedling'),
  ('Renovations', 'Home and commercial renovation projects', FALSE, TRUE, 'fas fa-home');

-- Insert admin user (password: admin123)
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, province, city, is_verified, email_verified) VALUES 
  ('admin@kwikr.ca', 'YWRtaW4xMjM=', 'admin', 'System', 'Administrator', 'ON', 'Toronto', TRUE, TRUE);

-- Insert demo client users (password: demo123)
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('demo.client@kwikr.ca', 'ZGVtbzEyMw==', 'client', 'Jennifer', 'Walsh', '+1-416-555-0101', 'ON', 'Toronto', TRUE, TRUE),
  ('client.demo@kwikr.ca', 'ZGVtbzEyMw==', 'client', 'Robert', 'Kim', '+1-604-555-0102', 'BC', 'Vancouver', TRUE, TRUE);

-- Insert sample workers - 5 per category (password: demo123)
-- Cleaning Services
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('cleaner1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Emma', 'Johnson', '+1-416-555-1001', 'ON', 'Toronto', TRUE, TRUE),
  ('cleaner2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Michael', 'Chen', '+1-416-555-1002', 'ON', 'Mississauga', TRUE, TRUE),
  ('cleaner3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Lisa', 'Anderson', '+1-604-555-1003', 'BC', 'Vancouver', TRUE, TRUE),
  ('cleaner4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Carlos', 'Martinez', '+1-403-555-1004', 'AB', 'Calgary', TRUE, TRUE),
  ('cleaner5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Sophie', 'Dubois', '+1-514-555-1005', 'QC', 'Montreal', TRUE, TRUE);

-- Plumbers
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('plumber1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'James', 'Wilson', '+1-416-555-2001', 'ON', 'Toronto', TRUE, TRUE),
  ('plumber2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Patricia', 'Brown', '+1-416-555-2002', 'ON', 'Ottawa', TRUE, TRUE),
  ('plumber3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Kevin', 'Lee', '+1-604-555-2003', 'BC', 'Vancouver', TRUE, TRUE),
  ('plumber4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Isabella', 'Garcia', '+1-403-555-2004', 'AB', 'Edmonton', TRUE, TRUE),
  ('plumber5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Pierre', 'Leblanc', '+1-514-555-2005', 'QC', 'Quebec City', TRUE, TRUE);

-- Carpenters
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('carpenter1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'William', 'Davis', '+1-416-555-3001', 'ON', 'Hamilton', TRUE, TRUE),
  ('carpenter2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jessica', 'Miller', '+1-416-555-3002', 'ON', 'London', TRUE, TRUE),
  ('carpenter3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Ryan', 'Taylor', '+1-604-555-3003', 'BC', 'Surrey', TRUE, TRUE),
  ('carpenter4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Amanda', 'White', '+1-403-555-3004', 'AB', 'Calgary', TRUE, TRUE),
  ('carpenter5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Marc', 'Tremblay', '+1-514-555-3005', 'QC', 'Laval', TRUE, TRUE);

-- Electricians
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('electrician1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Christopher', 'Moore', '+1-416-555-4001', 'ON', 'Toronto', TRUE, TRUE),
  ('electrician2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Ashley', 'Jackson', '+1-416-555-4002', 'ON', 'Kitchener', TRUE, TRUE),
  ('electrician3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Brandon', 'Clark', '+1-604-555-4003', 'BC', 'Burnaby', TRUE, TRUE),
  ('electrician4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Stephanie', 'Lewis', '+1-403-555-4004', 'AB', 'Red Deer', TRUE, TRUE),
  ('electrician5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jean', 'Moreau', '+1-514-555-4005', 'QC', 'Gatineau', TRUE, TRUE);

-- Flooring
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('flooring1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Matthew', 'Harris', '+1-416-555-5001', 'ON', 'Brampton', TRUE, TRUE),
  ('flooring2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Nicole', 'Martin', '+1-416-555-5002', 'ON', 'Windsor', TRUE, TRUE),
  ('flooring3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Tyler', 'Thompson', '+1-604-555-5003', 'BC', 'Richmond', TRUE, TRUE),
  ('flooring4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Samantha', 'Walker', '+1-403-555-5004', 'AB', 'Lethbridge', TRUE, TRUE),
  ('flooring5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Antoine', 'Roy', '+1-514-555-5005', 'QC', 'Sherbrooke', TRUE, TRUE);

-- Painters  
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('painter1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Daniel', 'Young', '+1-416-555-6001', 'ON', 'Oakville', TRUE, TRUE),
  ('painter2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Rachel', 'Hall', '+1-416-555-6002', 'ON', 'Oshawa', TRUE, TRUE),
  ('painter3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jason', 'Allen', '+1-604-555-6003', 'BC', 'Victoria', TRUE, TRUE),
  ('painter4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Lauren', 'King', '+1-403-555-6004', 'AB', 'Medicine Hat', TRUE, TRUE),
  ('painter5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Francois', 'Gagnon', '+1-514-555-6005', 'QC', 'Trois-Rivières', TRUE, TRUE);

-- Add remaining workers for other categories (abbreviated for space)
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('handyman1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Anthony', 'Scott', '+1-416-555-7001', 'ON', 'Burlington', TRUE, TRUE),
  ('hvac1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Nicholas', 'Nelson', '+1-416-555-8001', 'ON', 'Markham', TRUE, TRUE),
  ('contractor1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jonathan', 'Roberts', '+1-416-555-9001', 'ON', 'Richmond Hill', TRUE, TRUE),
  ('roofer1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Benjamin', 'Evans', '+1-416-555-1001', 'ON', 'Guelph', TRUE, TRUE),
  ('landscaper1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Alexander', 'Sanchez', '+1-416-555-1101', 'ON', 'Barrie', TRUE, TRUE),
  ('renovator1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Gabriel', 'Cook', '+1-416-555-1201', 'ON', 'St. Catharines', TRUE, TRUE);

-- Insert user profiles for key users
INSERT OR IGNORE INTO user_profiles (user_id, bio, address_line1, postal_code) VALUES 
  (1, 'Platform administrator managing Kwikr Directory operations.', '100 Admin Street', 'M5H 2N2'),
  (2, 'Homeowner looking for reliable service providers for various home projects.', '123 Demo Street', 'M5V 3A3'),
  (3, 'Property manager for residential buildings in Vancouver area.', '456 Test Avenue', 'V6B 2M9');

-- Insert default subscriptions
INSERT OR IGNORE INTO subscriptions (user_id, plan_type, status, monthly_fee, per_job_fee) VALUES 
  (1, 'admin', 'active', 0.00, 0.00),
  (2, 'pay_as_you_go', 'active', 0.00, 12.00),
  (3, 'pay_as_you_go', 'active', 0.00, 12.00);

-- Insert 10 sample jobs from different categories
INSERT OR IGNORE INTO jobs (
  client_id, title, description, category_id, budget_min, budget_max, 
  urgency, location_province, location_city, 
  start_date, expected_completion, status
) VALUES 
  (2, 'Deep Clean 3-Bedroom House', 'Need thorough deep cleaning of entire house including carpets, windows, and appliances. House has been vacant for 2 months.', 1, 300, 500, 'normal', 'ON', 'Toronto', DATE('now', '+3 days'), DATE('now', '+5 days'), 'posted'),
  
  (3, 'Kitchen Sink Installation', 'Replace old kitchen sink with new undermount stainless steel sink. Includes disconnecting old sink and connecting new one.', 2, 200, 400, 'high', 'BC', 'Vancouver', DATE('now', '+1 day'), DATE('now', '+3 days'), 'posted'),
  
  (2, 'Custom Built-in Bookshelf', 'Design and build custom built-in bookshelf for living room. Dimensions: 8ft wide x 10ft tall. Prefer solid wood construction.', 3, 800, 1500, 'low', 'ON', 'Toronto', DATE('now', '+7 days'), DATE('now', '+21 days'), 'posted'),
  
  (3, 'Electrical Panel Upgrade', 'Upgrade 100A electrical panel to 200A to support new home additions. Need licensed electrician with permits.', 4, 800, 1200, 'high', 'BC', 'Vancouver', DATE('now', '+2 days'), DATE('now', '+5 days'), 'posted'),
  
  (2, 'Hardwood Floor Refinishing', 'Refinish 1200 sq ft of oak hardwood floors in main living areas. Floors need sanding, staining, and polyurethane finish.', 5, 1200, 2000, 'normal', 'ON', 'Toronto', DATE('now', '+14 days'), DATE('now', '+21 days'), 'posted'),
  
  (3, 'Exterior House Painting', 'Paint exterior of 2-story house including trim and shutters. Surface prep and primer included. Prefer high-quality paint.', 6, 2500, 4000, 'normal', 'BC', 'Vancouver', DATE('now', '+10 days'), DATE('now', '+28 days'), 'posted'),
  
  (2, 'Bathroom Fixture Repairs', 'Multiple small repairs needed: fix leaky faucet, replace toilet handle, caulk around tub, install new towel bars.', 7, 150, 300, 'normal', 'ON', 'Toronto', DATE('now', '+2 days'), DATE('now', '+4 days'), 'posted'),
  
  (3, 'Central Air Installation', 'Install central air conditioning system in 1800 sq ft bungalow. Include ductwork modifications and smart thermostat.', 8, 3000, 5000, 'urgent', 'BC', 'Vancouver', DATE('now', '+1 day'), DATE('now', '+7 days'), 'posted'),
  
  (2, 'Basement Renovation', 'Complete basement finishing project including framing, drywall, flooring, and electrical rough-in. 800 sq ft space.', 9, 8000, 15000, 'low', 'ON', 'Toronto', DATE('now', '+30 days'), DATE('now', '+90 days'), 'posted'),
  
  (3, 'Roof Leak Repair', 'Emergency roof leak repair needed. Water coming through ceiling in master bedroom. Need immediate assessment and repair.', 10, 300, 800, 'urgent', 'BC', 'Vancouver', DATE('now'), DATE('now', '+2 days'), 'posted');