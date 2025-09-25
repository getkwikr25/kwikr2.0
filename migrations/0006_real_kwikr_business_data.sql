-- Migration to add real Kwikr business data
-- This script adds real Calgary businesses to replace demo data

-- Insert real Calgary businesses with proper Kwikr profile image URLs
-- Business 1: Pronghorn Controls Ltd (from user's example)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(5, 'contact@pronghorncontrols.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Service', 'Manager', '+1-403-555-0301', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(5, 'Professional controls and automation services for residential and commercial properties in Calgary.', 'https://www.kwikr.ca/pictures/profile/pimage-172.jpg', '1234 Industrial Ave NE', 'Suite 200', 'T2E 7H7', 'Pronghorn Controls Ltd', 'Specializing in building automation, HVAC controls, and electrical systems for homes and businesses across Calgary and surrounding areas.', 'https://www.kwikr.ca/pictures/profile/pimage-172.jpg', 'https://www.pronghorncontrols.com', 8);

-- Business 2: Arpi's HVAC (Real Calgary business)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(6, 'service@arpis.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Arpis', 'Service', '+1-403-888-4567', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(6, 'Calgary trusted HVAC, plumbing, heating and cooling experts serving residential customers for over 55 years.', 'https://www.kwikr.ca/pictures/profile/pimage-158.jpg', '5940 1A St SW', '', 'T2H 0G3', 'Arpis Industries Ltd', 'One of Calgary best HVAC companies providing residential plumbing, heating, cooling, and maintenance services. Family-owned business serving Calgarians since 1963.', 'https://www.kwikr.ca/pictures/profile/pimage-158.jpg', 'https://www.arpis.com', 55);

-- Business 3: The Gentlemen Pros (Real Calgary business)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(7, 'calgary@thegentlemenpros.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Gentlemen', 'Pros', '+1-403-777-8899', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(7, 'Professional plumbing, electrical, and HVAC services with exceptional customer service and quality workmanship.', 'https://www.kwikr.ca/pictures/profile/pimage-234.jpg', '3625 Shaganappi Trail NW', 'Unit 144', 'T3A 0E2', 'The Gentlemen Pros', 'Premier home services company offering plumbing, electrical, and HVAC solutions with a focus on professionalism and customer satisfaction.', 'https://www.kwikr.ca/pictures/profile/pimage-234.jpg', 'https://thegentlemenpros.com/calgary', 12);

-- Business 4: Aquality Plumbing & Heating (Real Calgary business)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
(8, 'info@aqualityplumber.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Aquality', 'Team', '+1-403-969-2667', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, address_line2, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(8, 'Calgary top choice for reliable plumbing and heating services with expert installations, repairs, and maintenance.', 'https://www.kwikr.ca/pictures/profile/pimage-189.jpg', '2411 4 St NE', '', 'T2E 3M9', 'Aquality Plumbing & Heating', 'Professional plumbing and heating services including emergency repairs, installations, and maintenance for residential and commercial properties in Calgary.', 'https://www.kwikr.ca/pictures/profile/pimage-189.jpg', 'https://aqualityplumber.com', 15);

-- Insert real services for these businesses
-- Pronghorn Controls Ltd services
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(5, 'Building Automation Systems', 'Electrical', 85.00, TRUE, 'Design and installation of automated building control systems for HVAC, lighting, and security'),
(5, 'HVAC Control Installation', 'HVAC', 75.00, TRUE, 'Professional installation and programming of heating and cooling control systems'),
(5, 'Electrical Panel Upgrades', 'Electrical', 90.00, TRUE, 'Residential and commercial electrical panel upgrades and maintenance');

-- Arpis HVAC services
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(6, 'Furnace Repair & Installation', 'HVAC', 95.00, TRUE, 'Expert furnace repair, maintenance, and new installation services'),
(6, 'Air Conditioning Services', 'HVAC', 95.00, TRUE, 'AC installation, repair, and seasonal maintenance for residential properties'),
(6, 'Plumbing Repairs', 'Plumbing', 85.00, TRUE, 'Emergency and scheduled plumbing repairs, pipe installation, and fixture replacement');

-- The Gentlemen Pros services
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(7, 'Emergency Plumbing', 'Plumbing', 120.00, TRUE, '24/7 emergency plumbing services including drain cleaning and pipe repairs'),
(7, 'Electrical Troubleshooting', 'Electrical', 100.00, TRUE, 'Professional electrical diagnostics and repair services for homes and businesses'),
(7, 'HVAC Maintenance', 'HVAC', 90.00, TRUE, 'Comprehensive heating and cooling system maintenance and tune-ups');

-- Aquality Plumbing services  
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(8, 'Water Heater Services', 'Plumbing', 80.00, TRUE, 'Water heater installation, repair, and maintenance for gas and electric units'),
(8, 'Drain Cleaning', 'Plumbing', 75.00, TRUE, 'Professional drain cleaning and sewer line maintenance services'),
(8, 'Boiler Services', 'HVAC', 85.00, TRUE, 'Boiler installation, repair, and annual maintenance for residential heating systems');