-- Additional worker data to enhance search functionality

-- Add more workers across different provinces and services
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('alex.electric@example.com', 'd29ya2VyMTIz', 'worker', 'Alex', 'Thompson', '+1-604-555-0301', 'BC', 'Vancouver', TRUE, TRUE),
  ('sarah.cleaner@example.com', 'd29ya2VyMTIz', 'worker', 'Sarah', 'Anderson', '+1-403-555-0302', 'AB', 'Calgary', TRUE, TRUE),
  ('mike.hvac@example.com', 'd29ya2VyMTIz', 'worker', 'Mike', 'Roberts', '+1-416-555-0303', 'ON', 'Mississauga', TRUE, TRUE),
  ('emma.painter@example.com', 'd29ya2VyMTIz', 'worker', 'Emma', 'Johnson', '+1-514-555-0304', 'QC', 'Montreal', TRUE, TRUE),
  ('james.landscaper@example.com', 'd29ya2VyMTIz', 'worker', 'James', 'Wilson', '+1-902-555-0305', 'NS', 'Halifax', TRUE, TRUE),
  ('lisa.flooring@example.com', 'd29ya2VyMTIz', 'worker', 'Lisa', 'Martinez', '+1-604-555-0306', 'BC', 'Burnaby', TRUE, TRUE),
  ('tom.handyman@example.com', 'd29ya2VyMTIz', 'worker', 'Tom', 'Davis', '+1-403-555-0307', 'AB', 'Edmonton', TRUE, TRUE),
  ('anna.roofer@example.com', 'd29ya2VyMTIz', 'worker', 'Anna', 'Brown', '+1-416-555-0308', 'ON', 'Toronto', TRUE, TRUE);

-- Add user profiles for the new workers
INSERT OR IGNORE INTO user_profiles (user_id, bio, address_line1, postal_code) VALUES 
  (10, 'Certified electrician with 8+ years of experience in residential and commercial electrical work.', '789 Electric Ave', 'V6B 1A2'),
  (11, 'Professional house cleaning service with eco-friendly products and flexible scheduling.', '456 Clean St', 'T2R 1C3'),
  (12, 'HVAC specialist focusing on energy-efficient heating and cooling solutions.', '321 Comfort Dr', 'L5B 2M4'),
  (13, 'Interior and exterior painter with expertise in color consultation and quality finishes.', '654 Paint Blvd', 'H3A 1B5'),
  (14, 'Landscape designer creating beautiful outdoor spaces with native plants.', '987 Garden Way', 'B3H 2Y6'),
  (15, 'Flooring contractor specializing in hardwood, laminate, and tile installations.', '159 Floor Ave', 'V5K 3L7'),
  (16, 'Experienced handyman providing reliable home maintenance and repair services.', '753 Fix It Ln', 'T6E 4N8'),
  (17, 'Licensed roofer offering comprehensive roofing solutions and emergency repairs.', '246 Roof St', 'M4X 1K9');

-- Add services for the new workers
-- Alex Thompson - Electrician in Vancouver, BC
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (10, 'Electrical', 'Electrical Repairs', 'Professional electrical repairs and troubleshooting', 85.00, TRUE, 8),
  (10, 'Electrical', 'Panel Upgrades', 'Electrical panel upgrades and installations', 95.00, TRUE, 8),
  (10, 'Electrical', 'Light Installation', 'Professional lighting installation and design', 75.00, TRUE, 8);

-- Sarah Anderson - Cleaner in Calgary, AB  
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (11, 'Cleaning', 'House Cleaning', 'Thorough residential cleaning services', 35.00, TRUE, 5),
  (11, 'Cleaning', 'Office Cleaning', 'Professional commercial cleaning services', 40.00, TRUE, 5),
  (11, 'Cleaning', 'Deep Cleaning', 'Comprehensive deep cleaning for move-ins/outs', 45.00, TRUE, 5);

-- Mike Roberts - HVAC in Mississauga, ON
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (12, 'HVAC', 'Furnace Repair', 'Furnace maintenance and repair services', 90.00, TRUE, 12),
  (12, 'HVAC', 'Air Conditioning', 'AC installation and maintenance', 85.00, TRUE, 12),
  (12, 'HVAC', 'Duct Cleaning', 'Professional ductwork cleaning and maintenance', 70.00, TRUE, 12);

-- Emma Johnson - Painter in Montreal, QC
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (13, 'Painting', 'Interior Painting', 'Professional interior painting services', 45.00, TRUE, 6),
  (13, 'Painting', 'Exterior Painting', 'High-quality exterior painting and staining', 50.00, TRUE, 6),
  (13, 'Painting', 'Color Consultation', 'Expert color selection and design advice', 60.00, TRUE, 6);

-- James Wilson - Landscaper in Halifax, NS
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (14, 'Landscaping', 'Garden Design', 'Custom landscape design and planning', 65.00, TRUE, 10),
  (14, 'Landscaping', 'Lawn Maintenance', 'Regular lawn care and maintenance services', 35.00, TRUE, 10),
  (14, 'Landscaping', 'Tree Services', 'Tree pruning, planting, and removal', 80.00, TRUE, 10);

-- Lisa Martinez - Flooring in Burnaby, BC
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (15, 'Flooring', 'Hardwood Installation', 'Professional hardwood flooring installation', 75.00, TRUE, 9),
  (15, 'Flooring', 'Laminate Installation', 'Quality laminate flooring services', 55.00, TRUE, 9),
  (15, 'Flooring', 'Tile Installation', 'Ceramic and stone tile installation', 65.00, TRUE, 9);

-- Tom Davis - Handyman in Edmonton, AB
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (16, 'Handyman', 'General Repairs', 'Home maintenance and general repairs', 55.00, TRUE, 15),
  (16, 'Handyman', 'Furniture Assembly', 'Professional furniture assembly services', 45.00, TRUE, 15),
  (16, 'Handyman', 'Small Renovations', 'Minor home renovation projects', 65.00, TRUE, 15);

-- Anna Brown - Roofer in Toronto, ON
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (17, 'Roofing', 'Roof Repair', 'Professional roofing repairs and maintenance', 95.00, TRUE, 7),
  (17, 'Roofing', 'Roof Installation', 'Complete roofing installation services', 105.00, TRUE, 7),
  (17, 'Roofing', 'Gutter Services', 'Gutter installation and maintenance', 60.00, TRUE, 7);