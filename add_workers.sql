-- Add comprehensive sample workers across all service categories

-- More Cleaning workers
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('jennifer.white@cleanpro.ca', 'd29ya2VyMTIz', 'worker', 'Jennifer', 'White', '+1-416-555-0301', 'ON', 'Toronto', TRUE, TRUE),
  ('michael.rodriguez@sparkle.ca', 'd29ya2VyMTIz', 'worker', 'Michael', 'Rodriguez', '+1-416-555-0302', 'ON', 'Toronto', TRUE, TRUE),
  ('amanda.lee@cleanhome.ca', 'd29ya2VyMTIz', 'worker', 'Amanda', 'Lee', '+1-604-555-0303', 'BC', 'Vancouver', TRUE, TRUE),
  ('robert.taylor@deepclean.ca', 'd29ya2VyMTIz', 'worker', 'Robert', 'Taylor', '+1-604-555-0304', 'BC', 'Vancouver', TRUE, TRUE);

-- Handyman workers  
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('steve.martinez@handyfix.ca', 'd29ya2VyMTIz', 'worker', 'Steve', 'Martinez', '+1-416-555-0401', 'ON', 'Toronto', TRUE, TRUE),
  ('karen.thompson@homerepair.ca', 'd29ya2VyMTIz', 'worker', 'Karen', 'Thompson', '+1-416-555-0402', 'ON', 'Toronto', TRUE, TRUE),
  ('patrick.davis@quickfix.ca', 'd29ya2VyMTIz', 'worker', 'Patrick', 'Davis', '+1-604-555-0403', 'BC', 'Vancouver', TRUE, TRUE),
  ('michelle.clark@allrepairs.ca', 'd29ya2VyMTIz', 'worker', 'Michelle', 'Clark', '+1-403-555-0404', 'AB', 'Calgary', TRUE, TRUE);

-- Plumbing workers
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('tony.garcia@pipepro.ca', 'd29ya2VyMTIz', 'worker', 'Tony', 'Garcia', '+1-416-555-0501', 'ON', 'Toronto', TRUE, TRUE),
  ('nancy.wilson@plumbfix.ca', 'd29ya2VyMTIz', 'worker', 'Nancy', 'Wilson', '+1-416-555-0502', 'ON', 'Toronto', TRUE, TRUE),
  ('james.moore@aquatech.ca', 'd29ya2VyMTIz', 'worker', 'James', 'Moore', '+1-604-555-0503', 'BC', 'Vancouver', TRUE, TRUE),
  ('linda.jackson@drainpro.ca', 'd29ya2VyMTIz', 'worker', 'Linda', 'Jackson', '+1-403-555-0504', 'AB', 'Calgary', TRUE, TRUE);

-- Electrical workers
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('carlos.hernandez@voltpro.ca', 'd29ya2VyMTIz', 'worker', 'Carlos', 'Hernandez', '+1-416-555-0601', 'ON', 'Toronto', TRUE, TRUE),
  ('susan.miller@sparkelectric.ca', 'd29ya2VyMTIz', 'worker', 'Susan', 'Miller', '+1-416-555-0602', 'ON', 'Toronto', TRUE, TRUE),
  ('daniel.anderson@powertech.ca', 'd29ya2VyMTIz', 'worker', 'Daniel', 'Anderson', '+1-604-555-0603', 'BC', 'Vancouver', TRUE, TRUE),
  ('rachel.thomas@wirepro.ca', 'd29ya2VyMTIz', 'worker', 'Rachel', 'Thomas', '+1-403-555-0604', 'AB', 'Calgary', TRUE, TRUE);

-- Painting workers
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('francisco.lopez@colorpro.ca', 'd29ya2VyMTIz', 'worker', 'Francisco', 'Lopez', '+1-416-555-0701', 'ON', 'Toronto', TRUE, TRUE),
  ('diane.harris@paintmaster.ca', 'd29ya2VyMTIz', 'worker', 'Diane', 'Harris', '+1-416-555-0702', 'ON', 'Toronto', TRUE, TRUE),
  ('kevin.martin@brushworks.ca', 'd29ya2VyMTIz', 'worker', 'Kevin', 'Martin', '+1-604-555-0703', 'BC', 'Vancouver', TRUE, TRUE),
  ('lisa.garcia@colorcraft.ca', 'd29ya2VyMTIz', 'worker', 'Lisa', 'Garcia', '+1-403-555-0704', 'AB', 'Calgary', TRUE, TRUE);

-- Add profiles for new workers
INSERT OR IGNORE INTO user_profiles (user_id, bio, company_name, years_in_business) VALUES 
  -- Cleaning workers (assuming IDs start from next available)
  ((SELECT MAX(id) FROM users) - 19, 'Professional residential and commercial cleaning with eco-friendly products.', 'CleanPro Services', 5),
  ((SELECT MAX(id) FROM users) - 18, 'Specialized in deep cleaning and post-construction cleanup.', 'Sparkle Clean', 3),
  ((SELECT MAX(id) FROM users) - 17, 'Family-owned cleaning business serving Vancouver for over 8 years.', 'CleanHome Solutions', 8),
  ((SELECT MAX(id) FROM users) - 16, 'Commercial cleaning specialist with IICRC certification.', 'DeepClean Pro', 6),
  
  -- Handyman workers
  ((SELECT MAX(id) FROM users) - 15, 'Licensed handyman specializing in home repairs and maintenance.', 'HandyFix Solutions', 7),
  ((SELECT MAX(id) FROM users) - 14, 'Experienced handywoman with expertise in plumbing and electrical repairs.', 'HomeRepair Plus', 4),
  ((SELECT MAX(id) FROM users) - 13, 'Quick and reliable handyman services for residential properties.', 'QuickFix Pro', 2),
  ((SELECT MAX(id) FROM users) - 12, 'Comprehensive home maintenance and repair services.', 'AllRepairs Inc', 9),
  
  -- Plumbing workers
  ((SELECT MAX(id) FROM users) - 11, 'Licensed master plumber with 15+ years experience.', 'PipePro Plumbing', 15),
  ((SELECT MAX(id) FROM users) - 10, 'Specializing in residential plumbing and drain cleaning.', 'PlumbFix Services', 8),
  ((SELECT MAX(id) FROM users) - 9, 'Commercial and residential plumbing solutions.', 'AquaTech Plumbing', 12),
  ((SELECT MAX(id) FROM users) - 8, 'Emergency plumbing services available 24/7.', 'DrainPro Solutions', 6),
  
  -- Electrical workers
  ((SELECT MAX(id) FROM users) - 7, 'Licensed electrician specializing in smart home technology.', 'VoltPro Electric', 10),
  ((SELECT MAX(id) FROM users) - 6, 'Residential and commercial electrical services.', 'Spark Electric', 7),
  ((SELECT MAX(id) FROM users) - 5, 'Certified electrical contractor with panel upgrade expertise.', 'PowerTech Solutions', 11),
  ((SELECT MAX(id) FROM users) - 4, 'Professional electrical installations and repairs.', 'WirePro Electric', 5),
  
  -- Painting workers
  ((SELECT MAX(id) FROM users) - 3, 'Interior and exterior painting with 20+ years experience.', 'ColorPro Painting', 20),
  ((SELECT MAX(id) FROM users) - 2, 'Residential painting specialist with color consultation.', 'PaintMaster Services', 8),
  ((SELECT MAX(id) FROM users) - 1, 'Commercial and residential painting contractor.', 'BrushWorks Inc', 6),
  ((SELECT MAX(id) FROM users), 'Professional painter specializing in decorative finishes.', 'ColorCraft Painting', 4);

-- Add worker services for each category
-- Cleaning services
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, years_experience) VALUES 
  -- Jennifer White
  ((SELECT MAX(id) FROM users) - 19, 'Cleaning', 'Residential Cleaning', 'Complete home cleaning service', 35, 5),
  ((SELECT MAX(id) FROM users) - 19, 'Home Cleaning Service', 'Deep Cleaning', 'Thorough deep cleaning service', 45, 5),
  -- Michael Rodriguez  
  ((SELECT MAX(id) FROM users) - 18, 'Cleaning', 'Post-Construction Cleanup', 'Specialized construction cleanup', 55, 3),
  ((SELECT MAX(id) FROM users) - 18, 'Office & Business Cleaning', 'Commercial Cleaning', 'Office and commercial spaces', 40, 3),
  -- Amanda Lee
  ((SELECT MAX(id) FROM users) - 17, 'Home Cleaning Service', 'Move-out Cleaning', 'Complete move-out cleaning', 50, 8),
  ((SELECT MAX(id) FROM users) - 17, 'Cleaning', 'Window Cleaning', 'Interior and exterior windows', 30, 8),
  -- Robert Taylor
  ((SELECT MAX(id) FROM users) - 16, 'Office & Business Cleaning', 'Carpet Cleaning', 'Professional carpet cleaning', 60, 6),
  ((SELECT MAX(id) FROM users) - 16, 'Cleaning', 'Upholstery Cleaning', 'Furniture and upholstery cleaning', 50, 6);

-- Handyman services
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, years_experience) VALUES 
  -- Steve Martinez
  ((SELECT MAX(id) FROM users) - 15, 'Handyman', 'General Repairs', 'Home maintenance and repairs', 45, 7),
  ((SELECT MAX(id) FROM users) - 15, 'Handyman', 'Furniture Assembly', 'IKEA and furniture assembly', 35, 7),
  -- Karen Thompson
  ((SELECT MAX(id) FROM users) - 14, 'Handyman', 'Drywall Repair', 'Drywall patching and repair', 50, 4),
  ((SELECT MAX(id) FROM users) - 14, 'Handyman', 'Tile Work', 'Bathroom and kitchen tiles', 55, 4),
  -- Patrick Davis
  ((SELECT MAX(id) FROM users) - 13, 'Handyman', 'Door Installation', 'Interior and exterior doors', 60, 2),
  ((SELECT MAX(id) FROM users) - 13, 'Handyman', 'Shelving Installation', 'Custom shelving solutions', 40, 2),
  -- Michelle Clark
  ((SELECT MAX(id) FROM users) - 12, 'Handyman', 'Deck Repair', 'Deck maintenance and repair', 65, 9),
  ((SELECT MAX(id) FROM users) - 12, 'Handyman', 'Fence Installation', 'Residential fencing', 55, 9);

-- Plumbing services
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, years_experience) VALUES 
  -- Tony Garcia
  ((SELECT MAX(id) FROM users) - 11, 'Plumbing', 'Drain Cleaning', 'Professional drain cleaning', 80, 15),
  ((SELECT MAX(id) FROM users) - 11, 'Plumbing', 'Water Heater Installation', 'Tank and tankless water heaters', 90, 15),
  -- Nancy Wilson
  ((SELECT MAX(id) FROM users) - 10, 'Plumbing', 'Toilet Repair', 'Toilet installation and repair', 70, 8),
  ((SELECT MAX(id) FROM users) - 10, 'Plumbing', 'Faucet Installation', 'Kitchen and bathroom faucets', 65, 8),
  -- James Moore
  ((SELECT MAX(id) FROM users) - 9, 'Plumbing', 'Pipe Repair', 'Residential pipe repair', 85, 12),
  ((SELECT MAX(id) FROM users) - 9, 'Plumbing', 'Bathroom Renovation', 'Complete bathroom plumbing', 95, 12),
  -- Linda Jackson
  ((SELECT MAX(id) FROM users) - 8, 'Plumbing', 'Emergency Repairs', '24/7 emergency plumbing', 100, 6),
  ((SELECT MAX(id) FROM users) - 8, 'Plumbing', 'Leak Detection', 'Professional leak detection', 75, 6);

-- Electrical services
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, years_experience) VALUES 
  -- Carlos Hernandez
  ((SELECT MAX(id) FROM users) - 7, 'Electrical', 'Smart Home Installation', 'Smart switches and outlets', 85, 10),
  ((SELECT MAX(id) FROM users) - 7, 'Electrical', 'Panel Upgrades', 'Electrical panel upgrades', 95, 10),
  -- Susan Miller
  ((SELECT MAX(id) FROM users) - 6, 'Electrical', 'Outlet Installation', 'New outlets and GFCI', 70, 7),
  ((SELECT MAX(id) FROM users) - 6, 'Electrical', 'Light Fixture Installation', 'Interior and exterior lighting', 75, 7),
  -- Daniel Anderson
  ((SELECT MAX(id) FROM users) - 5, 'Electrical', 'Ceiling Fan Installation', 'Ceiling fans and controls', 80, 11),
  ((SELECT MAX(id) FROM users) - 5, 'Electrical', 'Electrical Troubleshooting', 'Electrical problem diagnosis', 90, 11),
  -- Rachel Thomas
  ((SELECT MAX(id) FROM users) - 4, 'Electrical', 'Home Automation', 'Smart home systems', 100, 5),
  ((SELECT MAX(id) FROM users) - 4, 'Electrical', 'Security System Wiring', 'Security and alarm systems', 85, 5);

-- Painting services
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, years_experience) VALUES 
  -- Francisco Lopez
  ((SELECT MAX(id) FROM users) - 3, 'Painting', 'Interior Painting', 'Residential interior painting', 50, 20),
  ((SELECT MAX(id) FROM users) - 3, 'Painting', 'Exterior Painting', 'House exterior painting', 55, 20),
  -- Diane Harris
  ((SELECT MAX(id) FROM users) - 2, 'Painting', 'Cabinet Painting', 'Kitchen cabinet refinishing', 60, 8),
  ((SELECT MAX(id) FROM users) - 2, 'Painting', 'Color Consultation', 'Professional color advice', 40, 8),
  -- Kevin Martin
  ((SELECT MAX(id) FROM users) - 1, 'Painting', 'Commercial Painting', 'Office and retail painting', 65, 6),
  ((SELECT MAX(id) FROM users) - 1, 'Painting', 'Wallpaper Removal', 'Wallpaper removal service', 45, 6),
  -- Lisa Garcia
  ((SELECT MAX(id) FROM users), 'Painting', 'Decorative Painting', 'Faux finishes and textures', 70, 4),
  ((SELECT MAX(id) FROM users), 'Painting', 'Trim Painting', 'Precision trim and detail work', 55, 4);