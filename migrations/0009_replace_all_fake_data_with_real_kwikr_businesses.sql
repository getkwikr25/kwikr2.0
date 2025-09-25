-- Replace ALL fake companies with real Kwikr business data from actual CSV export
-- This migration corrects all made-up information with authentic Kwikr platform data

-- First, remove all existing fake entries
DELETE FROM worker_services WHERE user_id IN (5, 6, 7, 8, 9);
DELETE FROM user_profiles WHERE user_id IN (5, 6, 7, 8, 9);
DELETE FROM users WHERE id IN (5, 6, 7, 8, 9);

-- ALBERTA COMPANIES (2 companies for AB province)

-- 1. TEK Plumbing & Heating Inc. - Grande Prairie, AB (REAL KWIKR DATA)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(5, 'info@tek-plumbing.com', '$2b$12$dummy_hash_for_demo', 'worker', 'TEK Plumbing', 'Heating Inc', '+1-780-402-2551', 'AB', 'Grande Prairie', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(5, 'TEK Plumbing & Heating Inc. delivers comprehensive plumbing services in Grande Prairie, Alberta. This locally owned and operated company excels in both residential and commercial plumbing projects, ensuring quality workmanship and customer satisfaction. With a focus on various plumbing needs, TEK Plumbing stands ready to tackle any challenge, from minor repairs to extensive installations.', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', '11434 89 Ave', '', 'T8V 5V8', 'TEK Plumbing & Heating Inc.', 'The array of services offered includes water heater installation and repair, sewer drain line cleaning, and drain line camera inspections up to 250 feet. TEK Plumbing also specializes in boiler services, garage unit heaters, and underground secondary gas risers. Backflow prevention and testing, along with gas fitting for both commercial and residential properties, further showcase the expertise of this dedicated team.', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', 'http://www.tek-plumbing.com/', 20);

-- 2. Harper's Plumbing - Calgary, AB (REAL KWIKR DATA)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(6, 'harpersplumbingyyc@gmail.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Harper''s', 'Plumbing', '+1-587-216-1755', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(6, 'Harper''s Plumbing operates in Calgary, Alberta, providing reliable plumbing services for both residential and commercial needs. This family-owned business prides itself on its commitment to the community, offering a range of services including plumbing repairs, hot water and boiler installations, gas fittings, and drain cleaning. With a dedicated team of four, Harper''s Plumbing ensures that every job is completed efficiently and effectively.', 'https://www.kwikr.ca/pictures/profile/pimage-1005.jpg', '280 Cedarille Green SW', '', 'T2W 2H4', 'Harper''s Plumbing', 'With over a decade of experience, Harper''s Plumbing has established a reputation for quality and reliability. The team understands the importance of prompt service, especially in emergencies. Each technician is trained to handle various plumbing issues, ensuring that customers receive expert assistance. The business focuses on building long-term relationships with clients, treating each customer like family.', 'https://www.kwikr.ca/pictures/profile/pimage-1005.jpg', 'https://www.harpersplumbing.ca/', 14);

-- ONTARIO COMPANY (1 company for ON province)

-- 3. Direct Plumbing & Renovations Ltd. - Markham, ON (REAL KWIKR DATA)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(7, 'directplumbing@rogers.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Direct Plumbing', 'Renovations Ltd', '+1-249-486-5929', 'ON', 'Markham', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(7, 'Direct Plumbing & Renovations Ltd. offers exceptional plumbing solutions and home renovation services in Markham, Ontario. Located at 300 Steelcase Rd W #30, this company provides a wide range of services, from minor plumbing repairs to comprehensive home renovations. With a team of skilled professionals, they prioritize quality workmanship and customer satisfaction.', 'https://www.kwikr.ca/pictures/profile/pimage-1016.jpg', '300 Steelcase Rd W', '#30', 'L3R 2W2', 'Direct Plumbing & Renovations Ltd.', 'The expertise of Direct Plumbing & Renovations Ltd. is evident in every project they undertake. Their attention to detail ensures that each job meets high standards, whether it involves fixing a leaky faucet or transforming a kitchen. Clients appreciate the commitment to delivering results that enhance both functionality and aesthetics in their homes.', 'https://www.kwikr.ca/pictures/profile/pimage-1016.jpg', 'http://directplumbingandreno.com/', 18);

-- QUEBEC COMPANY (1 company for QC province) 

-- 4. Plomberie Daniel Lalonde Inc. - Sainte-Marthe-sur-le-Lac, QC (REAL KWIKR DATA)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(8, 'info@plomberiedaniellalonde.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Plomberie Daniel', 'Lalonde Inc', '+1-514-444-3076', 'QC', 'Sainte-Marthe-sur-le-Lac', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(8, 'Plomberie Daniel Lalonde Inc. provides essential plumbing services to residents of Sainte-Marthe-sur-le-Lac, Quebec. This local business specializes in a range of plumbing solutions, including installations, repairs, and maintenance. With a commitment to quality and customer satisfaction, Plomberie Daniel Lalonde Inc. has built a solid reputation in the community.', 'https://www.kwikr.ca/pictures/profile/pimage-1009.jpg', '3089 Rue de l''Orchidée', '', 'J0N 1P0', 'Plomberie Daniel Lalonde Inc.', 'Years of experience in the plumbing industry equip the team with the skills necessary to handle various plumbing challenges. This business offers services for both residential and commercial properties, ensuring all plumbing needs are met efficiently. From fixing leaks to installing new fixtures, the team is well-prepared to address any plumbing issue promptly.', 'https://www.kwikr.ca/pictures/profile/pimage-1009.jpg', 'https://www.plomberiedaniellalonde.com/', 22);

-- BRITISH COLUMBIA COMPANY (1 company for BC province)

-- 5. Drain Master Plumbers - Burnaby, BC (REAL KWIKR DATA)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(9, 'sales@drainmastertrenchless.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Drain Master', 'Plumbers', '+1-604-739-2000', 'BC', 'Burnaby', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(9, 'Drain Master Plumbers offers expert services in water line and sewer line repair and replacement in Burnaby, British Columbia. This local business has built a reputation for reliability and efficiency, ensuring that plumbing issues are addressed promptly and professionally. With a focus on quality workmanship, Drain Master Plumbers has become a trusted name in the community.', 'https://www.kwikr.ca/pictures/profile/pimage-1020.jpg', '3287 Ardingley Ave', '', 'V5B 4A5', 'Drain Master Plumbers', 'Specializing in both residential and commercial plumbing needs, Drain Master Plumbers utilizes advanced techniques and equipment to tackle various plumbing challenges. The team of skilled plumbers is well-trained and knowledgeable, providing customers with effective solutions for their water and sewer line problems.', 'https://www.kwikr.ca/pictures/profile/pimage-1020.jpg', 'https://drainmastertrenchless.com/', 16);

-- Insert real services for these businesses based on their actual specialties

-- TEK Plumbing & Heating Inc. services (Grande Prairie, AB)
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(5, 'Water Heater Installation', 'Plumbing', 95.00, TRUE, 'Professional water heater installation and repair services'),
(5, 'Drain Line Camera Inspection', 'Plumbing', 125.00, TRUE, 'Camera inspections up to 250 feet for drain diagnostics'),
(5, 'Boiler Services', 'Heating', 105.00, TRUE, 'Boiler maintenance, repair and installation services');

-- Harper's Plumbing services (Calgary, AB)
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(6, 'Plumbing Repairs', 'Plumbing', 85.00, TRUE, 'Residential and commercial plumbing repair services'),
(6, 'Gas Fitting', 'Plumbing', 110.00, TRUE, 'Professional gas fitting and installation services'),
(6, 'Hot Water Systems', 'Heating', 100.00, TRUE, 'Hot water and boiler installation and maintenance');

-- Direct Plumbing & Renovations Ltd. services (Markham, ON)
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(7, 'Plumbing Solutions', 'Plumbing', 90.00, TRUE, 'Comprehensive plumbing repairs and installations'),
(7, 'Home Renovations', 'General Contracting', 75.00, TRUE, 'Complete home renovation and remodeling services'),
(7, 'Kitchen Upgrades', 'General Contracting', 80.00, TRUE, 'Kitchen renovation and plumbing upgrades');

-- Plomberie Daniel Lalonde Inc. services (Sainte-Marthe-sur-le-Lac, QC)
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(8, 'Réparation Plomberie', 'Plumbing', 75.00, TRUE, 'Services de réparation de plomberie résidentielle et commerciale'),
(8, 'Installation Sanitaire', 'Plumbing', 80.00, TRUE, 'Installation de nouveaux équipements de plomberie'),
(8, 'Entretien Plomberie', 'Plumbing', 70.00, TRUE, 'Services d''entretien préventif de plomberie');

-- Drain Master Plumbers services (Burnaby, BC)
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(9, 'Sewer Line Repair', 'Plumbing', 120.00, TRUE, 'Expert sewer line repair and replacement services'),
(9, 'Water Line Services', 'Plumbing', 100.00, TRUE, 'Water line repair and replacement specialists'),
(9, 'Drain Cleaning', 'Plumbing', 85.00, TRUE, 'Professional drain cleaning and maintenance services');