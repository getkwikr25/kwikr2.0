-- Sample worker data for testing search functionality

-- Insert sample workers
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
  ('john.plumber@example.com', 'password123', 'worker', 'John', 'Smith', '+1-416-555-0101', 'ON', 'Toronto', TRUE, TRUE, TRUE),
  ('maria.cleaner@example.com', 'password123', 'worker', 'Maria', 'Garcia', '+1-604-555-0102', 'BC', 'Vancouver', TRUE, TRUE, TRUE),
  ('david.electrician@example.com', 'password123', 'worker', 'David', 'Johnson', '+1-403-555-0103', 'AB', 'Calgary', TRUE, TRUE, TRUE),
  ('lisa.hvac@example.com', 'password123', 'worker', 'Lisa', 'Wilson', '+1-416-555-0104', 'ON', 'Ottawa', TRUE, TRUE, TRUE),
  ('mike.handyman@example.com', 'password123', 'worker', 'Mike', 'Brown', '+1-604-555-0105', 'BC', 'Surrey', TRUE, TRUE, TRUE),
  ('sarah.painter@example.com', 'password123', 'worker', 'Sarah', 'Davis', '+1-514-555-0106', 'QC', 'Montreal', TRUE, TRUE, TRUE),
  ('robert.carpenter@example.com', 'password123', 'worker', 'Robert', 'Miller', '+1-416-555-0107', 'ON', 'Mississauga', TRUE, TRUE, TRUE),
  ('jennifer.flooring@example.com', 'password123', 'worker', 'Jennifer', 'Anderson', '+1-403-555-0108', 'AB', 'Edmonton', TRUE, TRUE, TRUE);

-- Insert user profiles for workers
INSERT OR IGNORE INTO user_profiles (user_id, bio, profile_image_url) VALUES 
  (2, 'Licensed plumber with 10+ years experience in residential and commercial plumbing.', 'https://via.placeholder.com/150'),
  (3, 'Professional cleaning service specializing in residential and office cleaning.', 'https://via.placeholder.com/150'),
  (4, 'Certified electrician providing electrical installations and repairs.', 'https://via.placeholder.com/150'),
  (5, 'HVAC specialist with expertise in heating and cooling systems.', 'https://via.placeholder.com/150'),
  (6, 'Experienced handyman for all your home repair and maintenance needs.', 'https://via.placeholder.com/150'),
  (7, 'Professional painter for interior and exterior painting projects.', 'https://via.placeholder.com/150'),
  (8, 'Skilled carpenter specializing in custom woodwork and home renovations.', 'https://via.placeholder.com/150'),
  (9, 'Flooring expert for hardwood, tile, and carpet installation.', 'https://via.placeholder.com/150');

-- Insert worker services
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, years_experience, is_available) VALUES 
  -- Plumber services (John Smith - Toronto, ON)
  (2, 'Plumbing Services', 'Residential Plumbing', 'Complete residential plumbing services including repairs, installations, and maintenance', 75.00, 10, TRUE),
  (2, 'Plumbing Services', 'Emergency Plumbing', 'Emergency plumbing repairs available 24/7', 95.00, 10, TRUE),
  (2, 'Plumbing Services', 'Drain Cleaning', 'Professional drain cleaning and unclogging services', 65.00, 10, TRUE),
  
  -- Cleaner services (Maria Garcia - Vancouver, BC)
  (3, 'Cleaning Services', 'House Cleaning', 'Professional residential cleaning services', 35.00, 8, TRUE),
  (3, 'Cleaning Services', 'Office Cleaning', 'Commercial office and building cleaning', 40.00, 8, TRUE),
  (3, 'Cleaning Services', 'Deep Cleaning', 'Thorough deep cleaning for move-in/move-out', 45.00, 8, TRUE),
  
  -- Electrician services (David Johnson - Calgary, AB)
  (4, 'Electrical Services', 'Electrical Repairs', 'Residential and commercial electrical repairs', 80.00, 12, TRUE),
  (4, 'Electrical Services', 'Panel Upgrades', 'Electrical panel upgrades and installations', 85.00, 12, TRUE),
  (4, 'Electrical Services', 'Light Installation', 'Light fixture and ceiling fan installation', 70.00, 12, TRUE),
  
  -- HVAC services (Lisa Wilson - Ottawa, ON)
  (5, 'HVAC Services', 'Furnace Repair', 'Furnace repair and maintenance services', 85.00, 15, TRUE),
  (5, 'HVAC Services', 'Air Conditioning', 'AC installation, repair, and maintenance', 80.00, 15, TRUE),
  (5, 'HVAC Services', 'Duct Cleaning', 'Professional duct cleaning services', 75.00, 15, TRUE),
  
  -- Handyman services (Mike Brown - Surrey, BC)
  (6, 'General Handyman', 'Home Repairs', 'General home repairs and maintenance', 45.00, 6, TRUE),
  (6, 'General Handyman', 'Furniture Assembly', 'Furniture assembly and installation', 40.00, 6, TRUE),
  (6, 'General Handyman', 'Drywall Repair', 'Drywall patching and repair services', 50.00, 6, TRUE),
  
  -- Painter services (Sarah Davis - Montreal, QC)
  (7, 'Painting Services', 'Interior Painting', 'Professional interior painting services', 55.00, 9, TRUE),
  (7, 'Painting Services', 'Exterior Painting', 'Exterior house and building painting', 60.00, 9, TRUE),
  (7, 'Painting Services', 'Color Consultation', 'Professional color consultation services', 50.00, 9, TRUE),
  
  -- Carpenter services (Robert Miller - Mississauga, ON)
  (8, 'Carpentry Services', 'Custom Cabinets', 'Custom cabinet design and installation', 70.00, 14, TRUE),
  (8, 'Carpentry Services', 'Deck Building', 'Deck construction and renovation', 65.00, 14, TRUE),
  (8, 'Carpentry Services', 'Trim Work', 'Interior trim and molding installation', 60.00, 14, TRUE),
  
  -- Flooring services (Jennifer Anderson - Edmonton, AB)
  (9, 'Flooring Services', 'Hardwood Installation', 'Hardwood flooring installation and refinishing', 65.00, 11, TRUE),
  (9, 'Flooring Services', 'Tile Installation', 'Ceramic and stone tile installation', 60.00, 11, TRUE),
  (9, 'Flooring Services', 'Carpet Installation', 'Carpet installation and replacement', 45.00, 11, TRUE);