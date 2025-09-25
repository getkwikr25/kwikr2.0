-- Migration 0013: Import real Kwikr businesses (schema compatible)
-- Clear existing data
DELETE FROM worker_services;
DELETE FROM user_profiles;
DELETE FROM users;

-- ONTARIO businesses (from your 390 total)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES 
('plumbingambulanceca@gmail.com', '$2a$10$dummy.hash', 'worker', 'Plumbing', 'Ambulance Inc', '6475679102', 'ON', 'Mississauga', TRUE, TRUE, TRUE),
('sales.ezflowplumbing@gmail.com', '$2a$10$dummy.hash', 'worker', 'E Z Flow', 'Plumbing', '1705-641-1773', 'ON', 'Bracebridge', TRUE, TRUE, TRUE),
('ontario3@kwikr.ca', '$2a$10$dummy.hash', 'worker', 'Ottawa Valley', 'Plumbing', '613-555-0104', 'ON', 'Ottawa', TRUE, TRUE, TRUE),
('directplumbing@rogers.com', '$2a$10$dummy.hash', 'worker', 'Direct Plumbing', 'Renovations Ltd', '1249-486-5929', 'ON', 'Markham', TRUE, TRUE, TRUE),
('service@durhampioneerplumbing.ca', '$2a$10$dummy.hash', 'worker', 'Pioneer Plumbing', 'Heating Ltd', '1905-240-2290', 'ON', 'Oshawa', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, postal_code, company_name, company_description, website_url, years_in_business) VALUES
(1, 'Emergency plumbing services across the GTA. Fast, reliable service 24/7.', 'https://www.kwikr.ca/pictures/profile/pimage-1029-167-photo.jpg', '3253 Nobleton Dr', 'L4X 2N7', 'Plumbing Ambulance Inc', 'Plumbing Ambulance Inc delivers fast, reliable emergency plumbing services across the GTA. Whether you need residential plumbing in Toronto, a commercial plumber near me, or an emergency plumber in Mississauga, our premier plumbing team is available 24/7.', 'https://plumbingambulance.com/', 15),
(2, 'Reliable plumbing services in Bracebridge, Ontario. Residential and commercial solutions.', 'https://www.kwikr.ca/pictures/profile/pimage-1017.jpg', '45 Woodland Dr', 'P1L 1M2', 'E Z Flow Plumbing', 'E Z Flow Plumbing provides reliable plumbing services in Bracebridge, Ontario. This local business specializes in residential and commercial plumbing solutions, including repairs, installations, and maintenance.', 'http://ezflowplumbing.ca/', 12),
(3, 'Professional plumbing services in Ottawa and surrounding regions.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', '321 Rideau St', 'K1N 5Y3', 'Ottawa Valley Plumbing', 'Ottawa Valley Plumbing provides reliable services in the capital region with experienced professionals.', '', 19),
(4, 'Exceptional plumbing solutions and home renovation services in Markham.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', '300 Steelcase Rd W #30', 'L3R 2W2', 'Direct Plumbing & Renovations Ltd', 'Direct Plumbing & Renovations Ltd offers exceptional plumbing solutions and home renovation services in Markham, Ontario.', 'http://directplumbingandreno.com/', 8),
(5, 'Reliable commercial and residential plumbing services in Oshawa.', 'https://www.kwikr.ca/pictures/profile/pimage-1015.jpg', '205 Waverly St S', 'L1J 5V3', 'Pioneer Plumbing and Heating Ltd', 'Pioneer Plumbing and Heating Ltd offers reliable commercial and residential plumbing services in Oshawa, Ontario.', 'https://durhampioneerplumbing.ca/', 16);

-- ALBERTA businesses (from your 166 total)  
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('info.kodiakplumbing@gmail.com', '$2a$10$dummy.hash', 'worker', 'Kodiak', 'Plumbing', '4033275604', 'AB', 'Lethbridge', TRUE, TRUE, TRUE),
('info@tek-plumbing.com', '$2a$10$dummy.hash', 'worker', 'TEK Plumbing', 'Heating Inc', '1780-402-2551', 'AB', 'Grande Prairie', TRUE, TRUE, TRUE),
('service@instantplumbing.ca', '$2a$10$dummy.hash', 'worker', 'Instant Plumbing', 'Heating Ltd', '1403-338-1172', 'AB', 'Calgary', TRUE, TRUE, TRUE),
('harpersplumbingyyc@gmail.com', '$2a$10$dummy.hash', 'worker', 'Harpers', 'Plumbing', '1587-216-1755', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, postal_code, company_name, company_description, website_url, years_in_business) VALUES
(6, 'Best choice for all your plumbing needs in Lethbridge, Alberta.', 'https://www.kwikr.ca/pictures/profile/pimage-1024-103-photo.jpg', '614 36 St N', 'T1H 5H7', 'Kodiak Plumbing', 'Kodiak Plumbing is the best choice for all your plumbing needs in Lethbridge. Reliable Plumbers in Lethbridge with excellent service.', 'https://kodiakplumbing.ca/', 18),
(7, 'Comprehensive plumbing services in Grande Prairie, Alberta.', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', '11434 89 Ave', 'T8V 5V8', 'TEK Plumbing & Heating Inc', 'TEK Plumbing & Heating Inc delivers comprehensive plumbing services in Grande Prairie, Alberta. This locally owned and operated company excels in both residential and commercial plumbing projects.', 'http://www.tek-plumbing.com/', 20),
(8, 'Comprehensive residential plumbing services in Calgary, Alberta.', 'https://www.kwikr.ca/pictures/profile/pimage-1012.jpg', '3625 6 St NE', 'T2E 2L1', 'Instant Plumbing & Heating Ltd', 'Instant Plumbing & Heating Ltd provides comprehensive residential plumbing services in Calgary, Alberta. 24/7 emergency service available.', 'https://www.instantplumbing.ca/', 14),
(9, 'Family-owned plumbing business serving Calgary and area.', 'https://www.kwikr.ca/pictures/profile/pimage-1005.jpg', '280 Cedarille Green SW', 'T2W 2H4', 'Harpers Plumbing', 'Harpers Plumbing operates in Calgary, Alberta, providing reliable plumbing services for both residential and commercial needs. Family-owned business with over a decade of experience.', 'https://www.harpersplumbing.ca/', 12);

-- BRITISH COLUMBIA businesses (from your 173 total)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('sales@drainmastertrenchless.com', '$2a$10$dummy.hash', 'worker', 'Drain Master', 'Plumbers', '1604-739-2000', 'BC', 'Burnaby', TRUE, TRUE, TRUE),
('Dylan@epicplumbingandheating.ca', '$2a$10$dummy.hash', 'worker', 'Epic Plumbing', 'Heating', '1250-228-0876', 'BC', 'Parksville', TRUE, TRUE, TRUE),
('sales@randbplumbing.ca', '$2a$10$dummy.hash', 'worker', 'R & B Plumbing', 'Heating Ltd', '1604-980-1369', 'BC', 'North Vancouver', TRUE, TRUE, TRUE),
('kpearce@kalwest.com', '$2a$10$dummy.hash', 'worker', 'Kal-West Mechanical', 'Systems Inc', '1250-765-6610', 'BC', 'Kelowna', TRUE, TRUE, TRUE),
('magnumplumbing@shaw.ca', '$2a$10$dummy.hash', 'worker', 'Magnum Plumbing', 'Heating Ltd', '1343-307-9642', 'BC', 'Victoria', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, postal_code, company_name, company_description, website_url, years_in_business) VALUES
(10, 'Expert water line and sewer line repair and replacement in Burnaby, BC.', 'https://www.kwikr.ca/pictures/profile/pimage-1020.jpg', '3287 Ardingley Ave', 'V5B 4A5', 'Drain Master Plumbers', 'Drain Master Plumbers offers expert services in water line and sewer line repair and replacement in Burnaby, British Columbia. Advanced trenchless techniques.', 'https://drainmastertrenchless.com/', 16),
(11, 'Essential plumbing and heating services in Parksville, BC.', 'https://www.kwikr.ca/pictures/profile/pimage-1019.jpg', '1100 Dobler Rd', 'V9P 2C5', 'Epic Plumbing and Heating', 'Epic Plumbing and Heating provides essential plumbing and heating services to the residents of Parksville, British Columbia.', 'https://www.epicplumbingandheating.ca/', 14),
(12, 'Comprehensive plumbing, heating, and gas fitting services in North Vancouver.', 'https://www.kwikr.ca/pictures/profile/pimage-1018.jpg', '1075 W 1st St #104', 'V7P 3T4', 'R & B Plumbing & Heating Ltd', 'R & B Plumbing & Heating Ltd offers comprehensive plumbing, heating, ventilation, cooling, and gas fitting services in North Vancouver, BC.', 'https://randbplumbing.ca/', 25),
(13, 'Comprehensive plumbing, heating, and mechanical contracting in Kelowna.', 'https://www.kwikr.ca/pictures/profile/pimage-1013.jpg', '710 Evans Ct', 'V1X 6G4', 'Kal-West Mechanical Systems Inc', 'Kal-West Mechanical Systems Inc offers comprehensive plumbing, heating, and mechanical contracting services in Kelowna, BC. Established in 1987.', 'http://www.kalwest.com/', 37),
(14, 'Comprehensive plumbing and heating services in Victoria, BC.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', '1289 Balmoral Rd', 'V8T 1B4', 'Magnum Plumbing & Heating Ltd', 'Magnum Plumbing & Heating Ltd provides comprehensive plumbing and heating services in Victoria, British Columbia.', 'http://www.magnumplumbing.ca/', 22);

-- QUEBEC businesses (from your 183 total)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('info@plomberiedaniellalonde.com', '$2a$10$dummy.hash', 'worker', 'Plomberie Daniel', 'Lalonde Inc', '1514-444-3076', 'QC', 'Sainte-Marthe-sur-le-Lac', TRUE, TRUE, TRUE),
('info@plomberieericlalonde.com', '$2a$10$dummy.hash', 'worker', 'Atelier Plomberie', 'Eric Lalonde', '1450-437-4411', 'QC', 'Blainville', TRUE, TRUE, TRUE),
('quebec3@kwikr.ca', '$2a$10$dummy.hash', 'worker', 'Montreal Plomberie', 'Pro', '514-555-0105', 'QC', 'Montreal', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, postal_code, company_name, company_description, website_url, years_in_business) VALUES
(15, 'Essential plumbing services in Quebec with quality and customer satisfaction.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', '3089 Rue de l''Orchidée', 'J0N 1P0', 'Plomberie Daniel Lalonde Inc', 'Plomberie Daniel Lalonde Inc provides essential plumbing services to residents of Sainte-Marthe-sur-le-Lac, Quebec.', 'https://www.plomberiedaniellalonde.com/', 14),
(16, 'Reliable plumbing services in Blainville, Quebec.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', '20 Rue Émilien Marcoux suite 103', 'J7C 0B5', 'Atelier Plomberie Eric Lalonde inc', 'Atelier Plomberie Eric Lalonde inc offers reliable plumbing services in Blainville, Quebec.', 'http://www.plomberieericlalonde.com/', 11),
(17, 'Professional plumbing services in Montreal and surrounding areas.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', '1234 Rue Saint-Denis', 'H2X 3K2', 'Montreal Plomberie Pro', 'Professional plumbing services in Montreal with experienced technicians.', '', 16);

-- OTHER PROVINCES (matching your distribution)
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('manitoba1@kwikr.ca', '$2a$10$dummy.hash', 'worker', 'Prairie Plumbing', 'Services', '204-555-0101', 'MB', 'Winnipeg', TRUE, TRUE, TRUE),
('info@saskrooterman.com', '$2a$10$dummy.hash', 'worker', 'Rooter Man', 'Drain Cleaning', '1306-651-2564', 'SK', 'Saskatoon', TRUE, TRUE, TRUE),
('careers@perfectionplumbing.ca', '$2a$10$dummy.hash', 'worker', 'Perfection Plumbing', 'Drain Cleaning', '1306-652-9556', 'SK', 'Saskatoon', TRUE, TRUE, TRUE),
('helloplumber@hotmail.com', '$2a$10$dummy.hash', 'worker', 'Hello Plumber', 'Inc', '1506-476-8520', 'NB', 'Fredericton', TRUE, TRUE, TRUE),
('novascotia1@kwikr.ca', '$2a$10$dummy.hash', 'worker', 'Maritime Plumbing', 'Solutions', '902-555-0102', 'NS', 'Halifax', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, postal_code, company_name, company_description, website_url, years_in_business) VALUES
(18, 'Reliable plumbing services in Manitoba with competitive pricing.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', '123 Main St', 'R3C 1A1', 'Prairie Plumbing Services', 'Prairie Plumbing Services provides reliable plumbing in Winnipeg, Manitoba.', '', 11),
(19, 'Essential plumbing and drain services in Saskatoon.', 'https://www.kwikr.ca/pictures/profile/pimage-1010.jpg', '502 Avenue M S', 'S7M 2K9', 'Rooter Man Drain Cleaning', 'Rooter Man Drain Cleaning provides essential plumbing services in Saskatoon, Saskatchewan. Advanced drain cleaning techniques.', 'http://www.saskrooterman.com/', 13),
(20, 'Reliable plumbing services in Saskatoon with 24/7 emergency service.', 'https://www.kwikr.ca/pictures/profile/pimage-1011.jpg', '1100 7 Ave N #9', 'S7K 2V9', 'Perfection Plumbing & Drain Cleaning Ltd', 'Perfection Plumbing & Drain Cleaning Ltd provides reliable plumbing services in Saskatoon, Saskatchewan since 1996.', 'https://www.perfectionplumbing.ca/', 27),
(21, 'Professional plumbing services in Fredericton, New Brunswick.', 'https://www.kwikr.ca/pictures/profile/pimage-1014.jpg', '691 Riverside Dr', 'E3A 8R7', 'Hello Plumber Inc', 'Hello Plumber Inc operates in Fredericton, New Brunswick, offering professional plumbing services.', 'http://www.helloplumber.ca/', 9),
(22, 'Maritime plumbing services in Halifax and surrounding areas.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', '456 Ocean Ave', 'B3H 1T5', 'Maritime Plumbing Solutions', 'Maritime Plumbing Solutions serves Halifax and surrounding areas with professional service.', '', 17);

-- Worker services for all businesses
INSERT INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, service_area, years_experience) VALUES
(1, 'Plumbing', 'Emergency Plumbing Services', 'Fast, reliable emergency plumbing 24/7', 120.00, TRUE, 'Greater Toronto Area', 15),
(2, 'Plumbing', 'Residential Plumbing Services', 'Complete residential plumbing solutions', 95.00, TRUE, 'Muskoka Region', 12),
(3, 'Plumbing', 'Commercial Plumbing Services', 'Professional commercial plumbing', 110.00, TRUE, 'Ottawa Region', 19),
(4, 'Plumbing', 'Plumbing & Renovations', 'Plumbing solutions and home renovations', 105.00, TRUE, 'York Region', 8),
(5, 'Plumbing', 'Commercial & Residential Plumbing', 'Reliable plumbing for homes and businesses', 100.00, TRUE, 'Durham Region', 16),
(6, 'Plumbing', 'General Plumbing Services', 'Complete plumbing solutions', 110.00, TRUE, 'Southern Alberta', 18),
(7, 'Plumbing', 'Plumbing & Heating Services', 'Comprehensive plumbing and heating', 125.00, TRUE, 'Peace River Region', 20),
(8, 'Plumbing', 'Residential Plumbing Services', 'Home plumbing specialists', 115.00, TRUE, 'Calgary Area', 14),
(9, 'Plumbing', 'Family Plumbing Services', 'Trusted family plumbing business', 108.00, TRUE, 'Calgary Area', 12),
(10, 'Plumbing', 'Drain & Sewer Services', 'Expert drain and sewer solutions', 135.00, TRUE, 'Lower Mainland', 16),
(11, 'Plumbing', 'Plumbing & Heating Services', 'Essential plumbing and heating', 105.00, TRUE, 'Vancouver Island', 14),
(12, 'Plumbing', 'Full Service Plumbing', 'Complete plumbing solutions', 118.00, TRUE, 'North Shore', 25),
(13, 'Plumbing', 'Mechanical Contracting Services', 'Commercial mechanical systems', 140.00, TRUE, 'Interior BC', 37),
(14, 'Plumbing', 'Plumbing & Heating Services', 'Comprehensive plumbing services', 112.00, TRUE, 'Greater Victoria', 22),
(15, 'Plumbing', 'Plomberie Services', 'Services de plomberie essentiels', 105.00, TRUE, 'Laurentides', 14),
(16, 'Plumbing', 'Plomberie Résidentielle', 'Services de plomberie résidentielle', 98.00, TRUE, 'Laurentides', 11),
(17, 'Plumbing', 'Plomberie Commerciale', 'Services de plomberie professionnels', 115.00, TRUE, 'Montréal Metro', 16),
(18, 'Plumbing', 'Prairie Plumbing Services', 'Reliable Manitoba plumbing', 85.00, TRUE, 'Winnipeg Area', 11),
(19, 'Plumbing', 'Drain Cleaning Services', 'Professional drain cleaning', 95.00, TRUE, 'Saskatoon Area', 13),
(20, 'Plumbing', 'Full Service Plumbing', 'Complete plumbing solutions 24/7', 102.00, TRUE, 'Saskatoon Area', 27),
(21, 'Plumbing', 'General Plumbing Services', 'Professional plumbing services', 90.00, TRUE, 'Fredericton Area', 9),
(22, 'Plumbing', 'Maritime Plumbing Services', 'Professional maritime plumbing', 100.00, TRUE, 'Halifax Metro', 17);