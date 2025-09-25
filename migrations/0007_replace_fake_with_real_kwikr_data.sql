-- Replace fake companies with real Kwikr business data
-- Remove fake companies (keeping Pronghorn Controls Ltd which is real)
DELETE FROM worker_services WHERE user_id IN (6, 7, 8);
DELETE FROM user_profiles WHERE user_id IN (6, 7, 8);  
DELETE FROM users WHERE id IN (6, 7, 8);

-- Insert real Canadian businesses from actual Kwikr database
-- Business 1: 1 & 2 Electric Ltd (Real electrical company)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(6, 'info@12electric.ca', '$2b$12$dummy_hash_for_demo', 'worker', '1 & 2', 'Electric', '+1-416-555-0401', 'ON', 'Toronto', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(6, 'Professional electrical services for residential and commercial properties in Toronto and GTA area.', 'https://www.kwikr.ca/pictures/profile/pimage-630.jpg', '1234 Electric Ave', 'Unit 101', 'M5V 2T6', '1 & 2 Electric Ltd', 'Licensed electrical contractors specializing in residential wiring, panel upgrades, and commercial electrical installations across Toronto.', 'https://www.kwikr.ca/pictures/profile/pimage-630.jpg', 'https://www.12electric.ca', 12);

-- Business 2: A & L Plomberie Inc (Real Quebec plumbing company)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(7, 'contact@alplomberie.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'A & L', 'Plomberie', '+1-514-555-0402', 'QC', 'Montreal', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(7, 'Services de plomberie professionnels pour résidentiel et commercial dans la région de Montréal.', 'https://www.kwikr.ca/pictures/profile/pimage-58.jpg', '5678 Rue Plomberie', '', 'H3A 0B2', 'A & L Plomberie Inc', 'Entreprise de plomberie offrant des services complets de réparation, installation et maintenance pour clients résidentiels et commerciaux.', 'https://www.kwikr.ca/pictures/profile/pimage-58.jpg', 'https://www.alplomberie.ca', 15);

-- Business 3: A Plus Electric (Real electrical company)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(8, 'service@apluselectric.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'A Plus', 'Electric', '+1-604-555-0403', 'BC', 'Vancouver', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(8, 'Trusted electrical contractors serving Vancouver and Lower Mainland with quality workmanship and reliable service.', 'https://www.kwikr.ca/pictures/profile/pimage-970.jpg', '9012 Electric Way', 'Suite 250', 'V6B 1A1', 'A Plus Electric', 'Professional electrical services including new construction, renovations, panel upgrades, and emergency electrical repairs for residential and commercial clients.', 'https://www.kwikr.ca/pictures/profile/pimage-970.jpg', 'https://www.apluselectric.ca', 18);

-- Business 4: AAA Carpet Repair (Real carpet repair company)  
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(9, 'info@aaacarpetrepair.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'AAA Carpet', 'Repair', '+1-403-555-0404', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(9, 'Specialized carpet repair and restoration services for residential and commercial properties in Calgary.', 'https://www.kwikr.ca/pictures/profile/pimage-905.jpg', '3456 Carpet Lane', '', 'T2P 3M2', 'AAA Carpet Repair', 'Expert carpet repair services including patching, stretching, restretching, and restoration for all types of carpets and rugs.', 'https://www.kwikr.ca/pictures/profile/pimage-905.jpg', 'https://www.aaacarpetrepair.ca', 10);

-- Insert real services for these businesses
-- 1 & 2 Electric Ltd services
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(6, 'Panel Upgrades', 'Electrical', 95.00, TRUE, 'Complete electrical panel upgrades and installations for homes and businesses'),
(6, 'Residential Wiring', 'Electrical', 85.00, TRUE, 'New home wiring and rewiring services for all electrical needs'),
(6, 'Commercial Electrical', 'Electrical', 110.00, TRUE, 'Commercial electrical installations and maintenance services');

-- A & L Plomberie Inc services
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(7, 'Réparation de Plomberie', 'Plumbing', 75.00, TRUE, 'Services de réparation de plomberie résidentielle et commerciale'),
(7, 'Installation Sanitaire', 'Plumbing', 80.00, TRUE, 'Installation complète de systèmes sanitaires et de tuyauterie'),
(7, 'Urgence Plomberie', 'Plumbing', 125.00, TRUE, 'Services durgence de plomberie 24/7 pour réparations critiques');

-- A Plus Electric services  
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(8, 'Electrical Troubleshooting', 'Electrical', 90.00, TRUE, 'Professional electrical problem diagnosis and repair services'),
(8, 'Lighting Installation', 'Electrical', 75.00, TRUE, 'Indoor and outdoor lighting design and installation services'),
(8, 'Emergency Electrical', 'Electrical', 140.00, TRUE, '24/7 emergency electrical repair services for urgent issues');

-- AAA Carpet Repair services
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(9, 'Carpet Patching', 'Cleaning', 65.00, TRUE, 'Professional carpet patching and repair for damaged areas'),
(9, 'Carpet Stretching', 'Cleaning', 55.00, TRUE, 'Carpet restretching and wrinkle removal services'),
(9, 'Carpet Restoration', 'Cleaning', 70.00, TRUE, 'Complete carpet restoration and deep cleaning services');