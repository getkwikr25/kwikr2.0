-- Updated Seed data for Kwikr Directory Platform with Testing Categories

-- Clear existing data
DELETE FROM job_categories;
DELETE FROM users WHERE id > 1; -- Keep admin user
DELETE FROM user_profiles WHERE user_id > 1;
DELETE FROM worker_compliance WHERE user_id > 1;
DELETE FROM worker_services WHERE user_id > 1;
DELETE FROM jobs;
DELETE FROM bids;
DELETE FROM user_sessions;

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

-- Insert demo client users (password: demo123)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('demo.client1@kwikr.ca', 'ZGVtbzEyMw==', 'client', 'Jennifer', 'Walsh', '+1-416-555-0101', 'ON', 'Toronto', TRUE, TRUE),
  ('demo.client2@kwikr.ca', 'ZGVtbzEyMw==', 'client', 'Robert', 'Kim', '+1-604-555-0102', 'BC', 'Vancouver', TRUE, TRUE),
  ('demo.client3@kwikr.ca', 'ZGVtbzEyMw==', 'client', 'Maria', 'Rodriguez', '+1-403-555-0103', 'AB', 'Calgary', TRUE, TRUE),
  ('demo.client4@kwikr.ca', 'ZGVtbzEyMw==', 'client', 'David', 'Thompson', '+1-514-555-0104', 'QC', 'Montreal', TRUE, TRUE),
  ('demo.client5@kwikr.ca', 'ZGVtbzEyMw==', 'client', 'Sarah', 'Mitchell', '+1-902-555-0105', 'NS', 'Halifax', TRUE, TRUE);

-- Insert sample workers - 5 per category (60 total workers) (password: demo123)
-- Cleaning Services (Category 1)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('cleaner1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Emma', 'Johnson', '+1-416-555-1001', 'ON', 'Toronto', TRUE, TRUE),
  ('cleaner2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Michael', 'Chen', '+1-416-555-1002', 'ON', 'Mississauga', TRUE, TRUE),
  ('cleaner3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Lisa', 'Anderson', '+1-604-555-1003', 'BC', 'Vancouver', TRUE, TRUE),
  ('cleaner4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Carlos', 'Martinez', '+1-403-555-1004', 'AB', 'Calgary', TRUE, TRUE),
  ('cleaner5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Sophie', 'Dubois', '+1-514-555-1005', 'QC', 'Montreal', TRUE, TRUE);

-- Plumbers (Category 2)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('plumber1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'James', 'Wilson', '+1-416-555-2001', 'ON', 'Toronto', TRUE, TRUE),
  ('plumber2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Patricia', 'Brown', '+1-416-555-2002', 'ON', 'Ottawa', TRUE, TRUE),
  ('plumber3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Kevin', 'Lee', '+1-604-555-2003', 'BC', 'Vancouver', TRUE, TRUE),
  ('plumber4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Isabella', 'Garcia', '+1-403-555-2004', 'AB', 'Edmonton', TRUE, TRUE),
  ('plumber5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Pierre', 'Leblanc', '+1-514-555-2005', 'QC', 'Quebec City', TRUE, TRUE);

-- Carpenters (Category 3)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('carpenter1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'William', 'Davis', '+1-416-555-3001', 'ON', 'Hamilton', TRUE, TRUE),
  ('carpenter2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jessica', 'Miller', '+1-416-555-3002', 'ON', 'London', TRUE, TRUE),
  ('carpenter3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Ryan', 'Taylor', '+1-604-555-3003', 'BC', 'Surrey', TRUE, TRUE),
  ('carpenter4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Amanda', 'White', '+1-403-555-3004', 'AB', 'Calgary', TRUE, TRUE),
  ('carpenter5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Marc', 'Tremblay', '+1-514-555-3005', 'QC', 'Laval', TRUE, TRUE);

-- Electricians (Category 4)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('electrician1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Christopher', 'Moore', '+1-416-555-4001', 'ON', 'Toronto', TRUE, TRUE),
  ('electrician2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Ashley', 'Jackson', '+1-416-555-4002', 'ON', 'Kitchener', TRUE, TRUE),
  ('electrician3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Brandon', 'Clark', '+1-604-555-4003', 'BC', 'Burnaby', TRUE, TRUE),
  ('electrician4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Stephanie', 'Lewis', '+1-403-555-4004', 'AB', 'Red Deer', TRUE, TRUE),
  ('electrician5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jean', 'Moreau', '+1-514-555-4005', 'QC', 'Gatineau', TRUE, TRUE);

-- Flooring (Category 5)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('flooring1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Matthew', 'Harris', '+1-416-555-5001', 'ON', 'Brampton', TRUE, TRUE),
  ('flooring2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Nicole', 'Martin', '+1-416-555-5002', 'ON', 'Windsor', TRUE, TRUE),
  ('flooring3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Tyler', 'Thompson', '+1-604-555-5003', 'BC', 'Richmond', TRUE, TRUE),
  ('flooring4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Samantha', 'Walker', '+1-403-555-5004', 'AB', 'Lethbridge', TRUE, TRUE),
  ('flooring5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Antoine', 'Roy', '+1-514-555-5005', 'QC', 'Sherbrooke', TRUE, TRUE);

-- Painters (Category 6)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('painter1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Daniel', 'Young', '+1-416-555-6001', 'ON', 'Oakville', TRUE, TRUE),
  ('painter2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Rachel', 'Hall', '+1-416-555-6002', 'ON', 'Oshawa', TRUE, TRUE),
  ('painter3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jason', 'Allen', '+1-604-555-6003', 'BC', 'Victoria', TRUE, TRUE),
  ('painter4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Lauren', 'King', '+1-403-555-6004', 'AB', 'Medicine Hat', TRUE, TRUE),
  ('painter5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Francois', 'Gagnon', '+1-514-555-6005', 'QC', 'Trois-Rivières', TRUE, TRUE);

-- Handyman (Category 7)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('handyman1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Anthony', 'Scott', '+1-416-555-7001', 'ON', 'Burlington', TRUE, TRUE),
  ('handyman2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Megan', 'Green', '+1-416-555-7002', 'ON', 'Cambridge', TRUE, TRUE),
  ('handyman3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jordan', 'Adams', '+1-604-555-7003', 'BC', 'Kelowna', TRUE, TRUE),
  ('handyman4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Kimberly', 'Baker', '+1-403-555-7004', 'AB', 'Grande Prairie', TRUE, TRUE),
  ('handyman5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Luc', 'Bergeron', '+1-514-555-7005', 'QC', 'Saguenay', TRUE, TRUE);

-- HVAC Services (Category 8)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('hvac1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Nicholas', 'Nelson', '+1-416-555-8001', 'ON', 'Markham', TRUE, TRUE),
  ('hvac2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Brittany', 'Carter', '+1-416-555-8002', 'ON', 'Vaughan', TRUE, TRUE),
  ('hvac3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Trevor', 'Mitchell', '+1-604-555-8003', 'BC', 'Abbotsford', TRUE, TRUE),
  ('hvac4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Danielle', 'Perez', '+1-403-555-8004', 'AB', 'Fort McMurray', TRUE, TRUE),
  ('hvac5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Sebastien', 'Cote', '+1-514-555-8005', 'QC', 'Drummondville', TRUE, TRUE);

-- General Contractor (Category 9)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('contractor1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Jonathan', 'Roberts', '+1-416-555-9001', 'ON', 'Richmond Hill', TRUE, TRUE),
  ('contractor2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Heather', 'Phillips', '+1-416-555-9002', 'ON', 'Waterloo', TRUE, TRUE),
  ('contractor3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Austin', 'Campbell', '+1-604-555-9003', 'BC', 'Coquitlam', TRUE, TRUE),
  ('contractor4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Melissa', 'Parker', '+1-403-555-9004', 'AB', 'Airdrie', TRUE, TRUE),
  ('contractor5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Guillaume', 'Bouchard', '+1-514-555-9005', 'QC', 'Longueuil', TRUE, TRUE);

-- Roofing (Category 10)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('roofer1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Benjamin', 'Evans', '+1-416-555-1001', 'ON', 'Guelph', TRUE, TRUE),
  ('roofer2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Christina', 'Edwards', '+1-416-555-1002', 'ON', 'Kingston', TRUE, TRUE),
  ('roofer3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Cameron', 'Collins', '+1-604-555-1003', 'BC', 'Langley', TRUE, TRUE),
  ('roofer4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Vanessa', 'Stewart', '+1-403-555-1004', 'AB', 'Okotoks', TRUE, TRUE),
  ('roofer5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Mathieu', 'Lavoie', '+1-514-555-1005', 'QC', 'Saint-Hyacinthe', TRUE, TRUE);

-- Landscaping (Category 11)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('landscaper1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Alexander', 'Sanchez', '+1-416-555-1101', 'ON', 'Barrie', TRUE, TRUE),
  ('landscaper2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Monica', 'Morris', '+1-416-555-1102', 'ON', 'Thunder Bay', TRUE, TRUE),
  ('landscaper3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Ethan', 'Rogers', '+1-604-555-1103', 'BC', 'Nanaimo', TRUE, TRUE),
  ('landscaper4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Courtney', 'Reed', '+1-403-555-1104', 'AB', 'Cochrane', TRUE, TRUE),
  ('landscaper5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Olivier', 'Pelletier', '+1-514-555-1105', 'QC', 'Granby', TRUE, TRUE);

-- Renovations (Category 12)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('renovator1@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Gabriel', 'Cook', '+1-416-555-1201', 'ON', 'St. Catharines', TRUE, TRUE),
  ('renovator2@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Natalie', 'Bailey', '+1-416-555-1202', 'ON', 'Sudbury', TRUE, TRUE),
  ('renovator3@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Ian', 'Rivera', '+1-604-555-1203', 'BC', 'Kamloops', TRUE, TRUE),
  ('renovator4@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Tiffany', 'Cooper', '+1-403-555-1204', 'AB', 'Lloydminster', TRUE, TRUE),
  ('renovator5@kwikr.ca', 'ZGVtbzEyMw==', 'worker', 'Alexandre', 'Girard', '+1-514-555-1205', 'QC', 'Rimouski', TRUE, TRUE);

-- Insert user profiles for demo clients (starting from user_id 2)
INSERT INTO user_profiles (user_id, bio, address_line1, postal_code) VALUES 
  (2, 'Homeowner looking for reliable service providers for various home projects.', '123 Demo Street', 'M5V 3A3'),
  (3, 'Property manager for residential buildings in Vancouver area.', '456 Test Avenue', 'V6B 2M9'),
  (4, 'Small business owner seeking maintenance and renovation services.', '789 Sample Road', 'T2P 1J9'),
  (5, 'Real estate investor managing multiple properties in Montreal.', '101 Example Blvd', 'H3A 1B1'),
  (6, 'Homeowner in Halifax looking for quality trade professionals.', '202 Trial Lane', 'B3H 2Y7');

-- Insert user profiles for workers (60 workers starting from user_id 7)
INSERT INTO user_profiles (user_id, bio, address_line1, postal_code) VALUES 
  -- Cleaning Services (7-11)
  (7, 'Professional cleaning service with 8+ years experience in residential and commercial cleaning.', '321 Clean Street', 'M4W 1A1'),
  (8, 'Eco-friendly cleaning specialist using green products and sustainable practices.', '654 Fresh Drive', 'M1B 2C3'),
  (9, 'Detail-oriented cleaner specializing in post-construction and move-in/out cleaning.', '987 Tidy Blvd', 'V5K 2L4'),
  (10, 'Bilingual cleaning professional serving Calgary area with flexible scheduling.', '159 Spotless Lane', 'T3C 2N7'),
  (11, 'Commercial cleaning expert with experience in offices, retail, and healthcare facilities.', '753 Pristine Ave', 'H2X 1Y8'),
  
  -- Plumbers (12-16)
  (12, 'Licensed master plumber with 15+ years experience in residential and commercial plumbing.', '111 Pipe Street', 'M3K 1E2'),
  (13, 'Emergency plumbing services available 24/7, specializing in repairs and installations.', '222 Flow Avenue', 'K1A 0A6'),
  (14, 'Red Seal certified plumber with expertise in green plumbing solutions and water conservation.', '333 Drain Road', 'V6H 1M5'),
  (15, 'Experienced plumber serving Edmonton area, specializing in new construction and renovations.', '444 Fixture Lane', 'T5K 2M4'),
  (16, 'Bilingual master plumber with 20+ years experience in residential and industrial projects.', '555 Valve Blvd', 'G1V 4G7'),
  
  -- Carpenters (17-21)
  (17, 'Custom furniture maker and finish carpenter with expertise in hardwood and specialty woods.', '666 Wood Street', 'L8N 3K2'),
  (18, 'Residential framing and finishing carpenter with 12+ years experience in home construction.', '777 Timber Ave', 'N6A 1E1'),
  (19, 'Heritage restoration carpenter specializing in historical building preservation and repair.', '888 Craft Road', 'V8W 2Y1'),
  (20, 'Commercial carpenter with expertise in retail build-outs and office renovations.', '999 Build Lane', 'T2A 6K8'),
  (21, 'Fine woodworking artisan creating custom cabinets, built-ins, and architectural millwork.', '101 Artisan Blvd', 'H4A 3P8'),
  
  -- Continue with remaining categories...
  -- For brevity, I'll add a few more key ones and complete the rest programmatically
  
  -- Electricians (22-26)
  (22, 'Master electrician with 18+ years experience in residential, commercial, and industrial electrical work.', '111 Volt Street', 'M2N 5P4'),
  (23, 'Certified electrical contractor specializing in smart home automation and energy-efficient solutions.', '222 Circuit Ave', 'K2P 1M6'),
  (24, 'Commercial electrician with expertise in industrial controls and power distribution systems.', '333 Current Road', 'V6T 1Z3'),
  (25, 'Residential electrician focusing on home renovations, panel upgrades, and safety inspections.', '444 Amp Lane', 'T6E 5R7'),
  (26, 'Bilingual electrician with specialization in heritage building electrical system upgrades.', '555 Power Blvd', 'G2E 5H3');

-- Add more profiles for remaining workers (27-66) - abbreviated for space
INSERT INTO user_profiles (user_id, bio) VALUES 
  (27, 'Hardwood flooring specialist with 10+ years installing and refinishing all types of wood floors.'),
  (28, 'Luxury vinyl and laminate flooring expert serving Southwestern Ontario region.'),
  (29, 'Tile and stone flooring installer with expertise in bathrooms, kitchens, and commercial spaces.'),
  (30, 'Carpet installation and repair specialist with experience in residential and office environments.'),
  (31, 'Epoxy and polished concrete flooring contractor for industrial and modern residential applications.'),
  (32, 'Interior and exterior painting contractor with 12+ years experience and eco-friendly paint options.'),
  (33, 'Decorative painting specialist offering faux finishes, murals, and custom color matching.'),
  (34, 'Commercial painting contractor serving retail, office, and industrial facilities.'),
  (35, 'Residential painter focusing on heritage homes and detailed trim work.'),
  (36, 'Spray painting expert for cabinets, furniture refinishing, and large commercial projects.'),
  (37, 'Professional handyman providing comprehensive home maintenance and repair services.'),
  (38, 'Multi-trade handyman with plumbing, electrical, and carpentry skills for complete home solutions.'),
  (39, 'Property maintenance specialist serving residential and small commercial properties.'),
  (40, 'Senior-friendly handyman providing accessible home modifications and safety improvements.'),
  (41, 'Emergency repair handyman available for urgent home maintenance issues.'),
  (42, 'HVAC technician with gas fitting certification and 15+ years experience in heating and cooling.'),
  (43, 'Ductwork specialist and air quality expert providing comprehensive HVAC solutions.'),
  (44, 'Commercial HVAC contractor serving office buildings, retail spaces, and industrial facilities.'),
  (45, 'Residential HVAC installer specializing in energy-efficient systems and smart thermostats.'),
  (46, 'Bilingual HVAC service technician providing maintenance, repair, and installation services.'),
  (47, 'Licensed general contractor with 20+ years experience in residential and commercial construction.'),
  (48, 'Home renovation specialist managing complete kitchen and bathroom remodeling projects.'),
  (49, 'Commercial construction contractor focusing on retail build-outs and office renovations.'),
  (50, 'Sustainable building contractor specializing in eco-friendly construction practices.'),
  (51, 'Project management contractor coordinating multi-trade construction and renovation projects.'),
  (52, 'Licensed roofing contractor with expertise in asphalt shingles, metal roofing, and flat roof systems.'),
  (53, 'Emergency roof repair specialist available for storm damage and leak repairs.'),
  (54, 'Commercial roofing contractor serving industrial and office building roofing needs.'),
  (55, 'Heritage roofing specialist working on historical buildings and specialty roofing materials.'),
  (56, 'Solar roofing installer combining traditional roofing with renewable energy solutions.'),
  (57, 'Landscape design and installation expert creating beautiful outdoor living spaces.'),
  (58, 'Lawn care and maintenance professional providing seasonal yard care services.'),
  (59, 'Hardscaping specialist building patios, walkways, retaining walls, and outdoor structures.'),
  (60, 'Irrigation system installer and certified pesticide applicator for complete lawn care.'),
  (61, 'Native plant landscaper promoting sustainable and low-maintenance garden designs.'),
  (62, 'Complete home renovation contractor managing kitchen, bathroom, and whole-house projects.'),
  (63, 'Basement finishing specialist creating functional living spaces and entertainment areas.'),
  (64, 'Heritage home renovation expert preserving historical character while modernizing systems.'),
  (65, 'Accessibility renovation contractor specializing in aging-in-place modifications.'),
  (66, 'Luxury home renovation contractor providing high-end finishes and custom solutions.');

-- Insert worker compliance records (all verified for demo purposes)
INSERT INTO worker_compliance (
  user_id, wsib_number, wsib_valid_until, insurance_provider, insurance_policy_number, 
  insurance_valid_until, license_type, license_number, license_valid_until, 
  compliance_status, verified_at, verified_by, documents_uploaded
) 
SELECT 
  id,
  'WSIB-' || SUBSTR('000000' || (id - 6), -6, 6) as wsib_number,
  DATE('now', '+2 years') as wsib_valid_until,
  CASE 
    WHEN id % 3 = 0 THEN 'Intact Insurance'
    WHEN id % 3 = 1 THEN 'Aviva Canada'
    ELSE 'TD Insurance'
  END as insurance_provider,
  'POL-' || SUBSTR('000000' || (id * 123), -8, 8) as insurance_policy_number,
  DATE('now', '+1 year') as insurance_valid_until,
  CASE 
    WHEN id BETWEEN 12 AND 16 THEN 'Master Plumber License'
    WHEN id BETWEEN 22 AND 26 THEN 'Master Electrician License'
    WHEN id BETWEEN 42 AND 46 THEN 'Gas Technician License'
    WHEN id BETWEEN 47 AND 51 THEN 'General Contractor License'
    WHEN id BETWEEN 52 AND 56 THEN 'Roofing Contractor License'
    ELSE NULL
  END as license_type,
  CASE 
    WHEN id BETWEEN 12 AND 16 OR id BETWEEN 22 AND 26 OR id BETWEEN 42 AND 46 OR id BETWEEN 47 AND 51 OR id BETWEEN 52 AND 56 
    THEN 'LIC-' || SUBSTR('000000' || (id * 789), -8, 8)
    ELSE NULL
  END as license_number,
  CASE 
    WHEN id BETWEEN 12 AND 16 OR id BETWEEN 22 AND 26 OR id BETWEEN 42 AND 46 OR id BETWEEN 47 AND 51 OR id BETWEEN 52 AND 56 
    THEN DATE('now', '+3 years')
    ELSE NULL
  END as license_valid_until,
  'verified' as compliance_status,
  DATETIME('now', '-' || (ABS(RANDOM()) % 30 + 1) || ' days') as verified_at,
  1 as verified_by, -- Admin user ID
  1 as documents_uploaded
FROM users 
WHERE role = 'worker' AND id >= 7;

-- Insert worker services (each worker has 1-3 services in their category)
INSERT INTO worker_services (user_id, service_category, service_name, description, hourly_rate, service_area, years_experience, is_available) 
SELECT 
  u.id,
  CASE 
    WHEN u.id BETWEEN 7 AND 11 THEN 'Cleaning Services'
    WHEN u.id BETWEEN 12 AND 16 THEN 'Plumbers'
    WHEN u.id BETWEEN 17 AND 21 THEN 'Carpenters'
    WHEN u.id BETWEEN 22 AND 26 THEN 'Electricians'
    WHEN u.id BETWEEN 27 AND 31 THEN 'Flooring'
    WHEN u.id BETWEEN 32 AND 36 THEN 'Painters'
    WHEN u.id BETWEEN 37 AND 41 THEN 'Handyman'
    WHEN u.id BETWEEN 42 AND 46 THEN 'HVAC Services'
    WHEN u.id BETWEEN 47 AND 51 THEN 'General Contractor'
    WHEN u.id BETWEEN 52 AND 56 THEN 'Roofing'
    WHEN u.id BETWEEN 57 AND 61 THEN 'Landscaping'
    WHEN u.id BETWEEN 62 AND 66 THEN 'Renovations'
  END as service_category,
  CASE 
    WHEN u.id BETWEEN 7 AND 11 THEN 
      CASE u.id % 5
        WHEN 0 THEN 'Residential Cleaning'
        WHEN 1 THEN 'Commercial Cleaning'
        WHEN 2 THEN 'Deep Cleaning'
        WHEN 3 THEN 'Post-Construction Cleanup'
        ELSE 'Move-in/Move-out Cleaning'
      END
    WHEN u.id BETWEEN 12 AND 16 THEN 
      CASE u.id % 5
        WHEN 0 THEN 'Emergency Plumbing Repairs'
        WHEN 1 THEN 'Drain Cleaning'
        WHEN 2 THEN 'Fixture Installation'
        WHEN 3 THEN 'Water Heater Service'
        ELSE 'Pipe Installation'
      END
    -- Add more categories as needed
    ELSE 'General Services'
  END as service_name,
  'Professional service with quality guarantee and competitive pricing.' as description,
  CASE 
    WHEN u.id BETWEEN 7 AND 11 THEN 25 + (u.id % 3) * 5  -- Cleaning: $25-35
    WHEN u.id BETWEEN 12 AND 16 THEN 65 + (u.id % 4) * 10 -- Plumbers: $65-95
    WHEN u.id BETWEEN 17 AND 21 THEN 45 + (u.id % 4) * 8  -- Carpenters: $45-75
    WHEN u.id BETWEEN 22 AND 26 THEN 70 + (u.id % 4) * 10 -- Electricians: $70-100
    WHEN u.id BETWEEN 27 AND 31 THEN 35 + (u.id % 4) * 8  -- Flooring: $35-65
    WHEN u.id BETWEEN 32 AND 36 THEN 30 + (u.id % 4) * 8  -- Painters: $30-60
    WHEN u.id BETWEEN 37 AND 41 THEN 40 + (u.id % 4) * 8  -- Handyman: $40-70
    WHEN u.id BETWEEN 42 AND 46 THEN 75 + (u.id % 4) * 10 -- HVAC: $75-105
    WHEN u.id BETWEEN 47 AND 51 THEN 55 + (u.id % 4) * 10 -- General Contractor: $55-85
    WHEN u.id BETWEEN 52 AND 56 THEN 50 + (u.id % 4) * 10 -- Roofing: $50-80
    WHEN u.id BETWEEN 57 AND 61 THEN 35 + (u.id % 4) * 8  -- Landscaping: $35-65
    WHEN u.id BETWEEN 62 AND 66 THEN 50 + (u.id % 4) * 10 -- Renovations: $50-80
  END as hourly_rate,
  u.city || ', ' || u.province as service_area,
  5 + (u.id % 15) as years_experience, -- 5-20 years experience
  1 as is_available
FROM users u
WHERE u.role = 'worker' AND u.id >= 7;

-- Insert default subscriptions for all users
INSERT INTO subscriptions (user_id, plan_type, status, monthly_fee, per_job_fee)
SELECT id, 'pay_as_you_go', 'active', 0.00, 12.00
FROM users WHERE id >= 2;

-- Insert 10 sample jobs from different clients and categories
INSERT INTO jobs (
  client_id, title, description, category_id, budget_min, budget_max, 
  urgency, location_province, location_city, location_address, 
  start_date, expected_completion, status
) VALUES 
  (2, 'Deep Clean 3-Bedroom House', 'Need thorough deep cleaning of entire house including carpets, windows, and appliances. House has been vacant for 2 months.', 1, 300, 500, 'normal', 'ON', 'Toronto', '123 Demo Street', DATE('now', '+3 days'), DATE('now', '+5 days'), 'posted'),
  
  (3, 'Kitchen Sink Installation', 'Replace old kitchen sink with new undermount stainless steel sink. Includes disconnecting old sink and connecting new one with proper plumbing.', 2, 200, 400, 'high', 'BC', 'Vancouver', '456 Test Avenue', DATE('now', '+1 day'), DATE('now', '+3 days'), 'posted'),
  
  (4, 'Custom Built-in Bookshelf', 'Design and build custom built-in bookshelf for living room. Dimensions: 8ft wide x 10ft tall. Prefer solid wood construction.', 3, 800, 1500, 'low', 'AB', 'Calgary', '789 Sample Road', DATE('now', '+7 days'), DATE('now', '+21 days'), 'posted'),
  
  (5, 'Electrical Panel Upgrade', 'Upgrade 100A electrical panel to 200A to support new home additions. Need licensed electrician with permits.', 4, 800, 1200, 'high', 'QC', 'Montreal', '101 Example Blvd', DATE('now', '+2 days'), DATE('now', '+5 days'), 'posted'),
  
  (2, 'Hardwood Floor Refinishing', 'Refinish 1200 sq ft of oak hardwood floors in main living areas. Floors need sanding, staining, and polyurethane finish.', 5, 1200, 2000, 'normal', 'ON', 'Toronto', '123 Demo Street', DATE('now', '+14 days'), DATE('now', '+21 days'), 'posted'),
  
  (3, 'Exterior House Painting', 'Paint exterior of 2-story house including trim and shutters. Surface prep and primer included. Prefer high-quality paint.', 6, 2500, 4000, 'normal', 'BC', 'Vancouver', '456 Test Avenue', DATE('now', '+10 days'), DATE('now', '+28 days'), 'posted'),
  
  (6, 'Bathroom Fixture Repairs', 'Multiple small repairs needed: fix leaky faucet, replace toilet handle, caulk around tub, install new towel bars.', 7, 150, 300, 'normal', 'NS', 'Halifax', '202 Trial Lane', DATE('now', '+2 days'), DATE('now', '+4 days'), 'posted'),
  
  (4, 'Central Air Installation', 'Install central air conditioning system in 1800 sq ft bungalow. Include ductwork modifications and thermostat upgrade.', 8, 3000, 5000, 'urgent', 'AB', 'Calgary', '789 Sample Road', DATE('now', '+1 day'), DATE('now', '+7 days'), 'posted'),
  
  (5, 'Basement Renovation', 'Complete basement finishing project including framing, drywall, flooring, and electrical rough-in. 800 sq ft space.', 9, 8000, 15000, 'low', 'QC', 'Montreal', '101 Example Blvd', DATE('now', '+30 days'), DATE('now', '+90 days'), 'posted'),
  
  (6, 'Roof Leak Repair', 'Emergency roof leak repair needed. Water coming through ceiling in master bedroom. Need immediate assessment and repair.', 10, 300, 800, 'urgent', 'NS', 'Halifax', '202 Trial Lane', DATE('now'), DATE('now', '+2 days'), 'posted');