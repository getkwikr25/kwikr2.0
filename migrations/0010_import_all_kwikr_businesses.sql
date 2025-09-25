-- Import all real Kwikr businesses - simplified batch import
-- This will add the most important businesses from your CSV data

-- Clear existing demo data first
DELETE FROM worker_services WHERE user_id BETWEEN 5 AND 2000;
DELETE FROM user_profiles WHERE user_id BETWEEN 5 AND 2000;  
DELETE FROM users WHERE id BETWEEN 5 AND 2000;

-- Import key Alberta businesses
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
(1001, 'sales@drainmastertrenchless.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Drain Master', 'Plumbers', '+1-604-739-2000', 'BC', 'Burnaby', TRUE, TRUE, TRUE),
(1002, 'info@tek-plumbing.com', '$2b$12$dummy_hash_for_demo', 'worker', 'TEK Plumbing', 'Heating Inc', '+1-780-402-2551', 'AB', 'Grande Prairie', TRUE, TRUE, TRUE),
(1003, 'harpersplumbingyyc@gmail.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Harper''s', 'Plumbing', '+1-587-216-1755', 'AB', 'Calgary', TRUE, TRUE, TRUE),
(1004, 'service@instantplumbing.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'Instant Plumbing', 'Heating Ltd', '+1-403-338-1172', 'AB', 'Calgary', TRUE, TRUE, TRUE),
(1005, 'reception@capitalplumbing.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'Capital Plumbing', 'Heating', '+1-780-451-5666', 'AB', 'Edmonton', TRUE, TRUE, TRUE),
(1006, 'directplumbing@rogers.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Direct Plumbing', 'Renovations Ltd', '+1-249-486-5929', 'ON', 'Markham', TRUE, TRUE, TRUE),
(1007, 'service@durhampioneerplumbing.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'Pioneer Plumbing', 'Heating Ltd', '+1-905-240-2290', 'ON', 'Oshawa', TRUE, TRUE, TRUE),
(1008, 'sales.ezflowplumbing@gmail.com', '$2b$12$dummy_hash_for_demo', 'worker', 'E Z Flow', 'Plumbing', '+1-705-641-1773', 'ON', 'Bracebridge', TRUE, TRUE, TRUE),
(1009, 'info@plomberiedaniellalonde.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Plomberie Daniel', 'Lalonde Inc', '+1-514-444-3076', 'QC', 'Sainte-Marthe-sur-le-Lac', TRUE, TRUE, TRUE),
(1010, 'info@plomberieericlalonde.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Atelier Plomberie', 'Eric Lalonde', '+1-450-437-4411', 'QC', 'Blainville', TRUE, TRUE, TRUE),
(1011, 'Dylan@epicplumbingandheating.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'Epic Plumbing', 'Heating', '+1-250-228-0876', 'BC', 'Parksville', TRUE, TRUE, TRUE),
(1012, 'sales@randbplumbing.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'R & B Plumbing', 'Heating Ltd', '+1-604-980-1369', 'BC', 'North Vancouver', TRUE, TRUE, TRUE),
(1013, 'kpearce@kalwest.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Kal-West Mechanical', 'Systems Inc', '+1-250-765-6610', 'BC', 'Kelowna', TRUE, TRUE, TRUE),
(1014, 'helloplumber@hotmail.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Hello Plumber', 'Inc', '+1-506-476-8520', 'NB', 'Fredericton', TRUE, TRUE, TRUE),
(1015, 'careers@perfectionplumbing.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'Perfection Plumbing', 'Drain Cleaning Ltd', '+1-306-652-9556', 'SK', 'Saskatoon', TRUE, TRUE, TRUE),
(1016, 'info@saskrooterman.com', '$2b$12$dummy_hash_for_demo', 'worker', 'Rooter Man', 'Drain Cleaning', '+1-306-651-2564', 'SK', 'Saskatoon', TRUE, TRUE, TRUE),
(1017, 'info@mdplumbing.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'Martin Dejong', 'Plumbing Heating', '+1-905-628-5266', 'ON', 'Lynden', TRUE, TRUE, TRUE),
(1018, 'magnumplumbing@shaw.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'Magnum Plumbing', 'Heating Ltd', '+1-343-307-9642', 'BC', 'Victoria', TRUE, TRUE, TRUE),
(1019, 'drainproottawainc@bellnet.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'DrainPro Ottawa', 'Plumbing Services', '+1-613-233-7586', 'ON', 'Nepean', TRUE, TRUE, TRUE),
(1020, 'info@baumanns.ca', '$2b$12$dummy_hash_for_demo', 'worker', 'Baumann''s Ventilation', 'Plumbing Ltd', '+1-403-529-9744', 'AB', 'Medicine Hat', TRUE, TRUE, TRUE);

-- Add profiles for these companies with real data
INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, postal_code, company_name, company_description, company_logo_url, website_url, years_in_business) VALUES
(1001, 'Drain Master Plumbers offers expert services in water line and sewer line repair and replacement in Burnaby, British Columbia.', 'https://www.kwikr.ca/pictures/profile/pimage-1020.jpg', '3287 Ardingley Ave', 'V5B 4A5', 'Drain Master Plumbers', 'Specializing in both residential and commercial plumbing needs, utilizing advanced techniques and equipment.', 'https://www.kwikr.ca/pictures/profile/pimage-1020.jpg', 'https://drainmastertrenchless.com/', 16),
(1002, 'TEK Plumbing & Heating Inc. delivers comprehensive plumbing services in Grande Prairie, Alberta.', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', '11434 89 Ave', 'T8V 5V8', 'TEK Plumbing & Heating Inc.', 'Locally owned and operated company excelling in both residential and commercial plumbing projects.', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', 'http://www.tek-plumbing.com/', 20),
(1003, 'Harper''s Plumbing operates in Calgary, Alberta, providing reliable plumbing services for residential and commercial needs.', 'https://www.kwikr.ca/pictures/profile/pimage-1005.jpg', '280 Cedarille Green SW', 'T2W 2H4', 'Harper''s Plumbing', 'Family-owned business with over a decade of experience, treating each customer like family.', 'https://www.kwikr.ca/pictures/profile/pimage-1005.jpg', 'https://www.harpersplumbing.ca/', 14),
(1004, 'Instant Plumbing & Heating Ltd provides comprehensive residential plumbing services in Calgary, Alberta.', 'https://www.kwikr.ca/pictures/profile/pimage-1012.jpg', '3625 6 St NE', 'T2E 2L1', 'Instant Plumbing & Heating Ltd', 'Specializing in toilet, drain, faucet, and shower repairs with 24/7 emergency service.', 'https://www.kwikr.ca/pictures/profile/pimage-1012.jpg', 'https://www.instantplumbing.ca/', 18),
(1005, 'Capital Plumbing & Heating provides comprehensive plumbing and heating services in Edmonton, Alberta.', 'https://www.kwikr.ca/pictures/profile/pimage-1003.jpg', '14843 118 Ave NW', 'T5L 2M7', 'Capital Plumbing & Heating', 'Over 20 years of experience in emergency plumbing, heating, cooling, and HVAC services.', 'https://www.kwikr.ca/pictures/profile/pimage-1003.jpg', 'https://capitalplumbing.ca/', 25),
(1006, 'Direct Plumbing & Renovations Ltd. offers exceptional plumbing solutions and home renovation services in Markham, Ontario.', 'https://www.kwikr.ca/pictures/profile/pimage-1016.jpg', '300 Steelcase Rd W #30', 'L3R 2W2', 'Direct Plumbing & Renovations Ltd.', 'Skilled professionals prioritizing quality workmanship and customer satisfaction.', 'https://www.kwikr.ca/pictures/profile/pimage-1016.jpg', 'http://directplumbingandreno.com/', 18),
(1007, 'Pioneer Plumbing and Heating Ltd. offers reliable commercial and residential plumbing services in Oshawa, Ontario.', 'https://www.kwikr.ca/pictures/profile/pimage-1015.jpg', '205 Waverly St S', 'L1J 5V3', 'Pioneer Plumbing and Heating Ltd.', 'Local business providing installation, maintenance, and repair of plumbing systems.', 'https://www.kwikr.ca/pictures/profile/pimage-1015.jpg', 'https://durhampioneerplumbing.ca/', 22),
(1008, 'E Z Flow Plumbing provides reliable plumbing services in Bracebridge, Ontario.', 'https://www.kwikr.ca/pictures/profile/pimage-1017.jpg', '45 Woodland Dr', 'P1L 1M2', 'E Z Flow Plumbing', 'Specializing in residential and commercial plumbing solutions with quality and customer satisfaction.', 'https://www.kwikr.ca/pictures/profile/pimage-1017.jpg', 'http://ezflowplumbing.ca/', 15),
(1009, 'Plomberie Daniel Lalonde Inc. provides essential plumbing services to residents of Sainte-Marthe-sur-le-Lac, Quebec.', 'https://www.kwikr.ca/pictures/profile/pimage-1009.jpg', '3089 Rue de l''Orchidée', 'J0N 1P0', 'Plomberie Daniel Lalonde Inc.', 'Specializing in plumbing solutions including installations, repairs, and maintenance.', 'https://www.kwikr.ca/pictures/profile/pimage-1009.jpg', 'https://www.plomberiedaniellalonde.com/', 22),
(1010, 'Atelier Plomberie Eric Lalonde inc offers reliable plumbing services in Blainville, Quebec.', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', '20 Rue Émilien Marcoux suite 103', 'J7C 0B5', 'Atelier Plomberie Eric Lalonde inc', 'Residential and commercial plumbing solutions with quality workmanship and customer satisfaction.', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', 'http://www.plomberieericlalonde.com/', 19),
(1011, 'Epic Plumbing and Heating provides essential plumbing and heating services to residents of Parksville, British Columbia.', 'https://www.kwikr.ca/pictures/profile/pimage-1019.jpg', '1100 Dobler Rd', 'V9P 2C5', 'Epic Plumbing and Heating', 'Strong reputation for delivering reliable and efficient solutions tailored to customer needs.', 'https://www.kwikr.ca/pictures/profile/pimage-1019.jpg', 'https://www.epicplumbingandheating.ca/', 17),
(1012, 'R & B Plumbing & Heating Ltd. offers comprehensive plumbing, heating, ventilation, cooling services in North Vancouver.', 'https://www.kwikr.ca/pictures/profile/pimage-1018.jpg', '1075 W 1st St #104', 'V7P 1A2', 'R & B Plumbing & Heating Ltd.', 'Excellence in residential and commercial projects using reputable products and modern techniques.', 'https://www.kwikr.ca/pictures/profile/pimage-1018.jpg', 'https://www.randbplumbing.ca/', 24),
(1013, 'Kal-West Mechanical Systems Inc. offers comprehensive plumbing, heating, and mechanical contracting services in Kelowna.', 'https://www.kwikr.ca/pictures/profile/pimage-1013.jpg', '710 Evans Ct', 'V1X 6R7', 'Kal-West Mechanical Systems Inc.', 'Established in 1987, trusted name for schools, hospitals, and large office buildings across the region.', 'https://www.kwikr.ca/pictures/profile/pimage-1013.jpg', 'http://www.kalwest.com/', 38),
(1014, 'Hello Plumber Inc. operates in Fredericton, New Brunswick, offering professional plumbing services.', 'https://www.kwikr.ca/pictures/profile/pimage-1014.jpg', '691 Riverside Dr', 'E3A 8R7', 'Hello Plumber Inc.', 'Prioritizing quality and competitive pricing for both residential and commercial needs.', 'https://www.kwikr.ca/pictures/profile/pimage-1014.jpg', 'https://www.helloplumber.ca/', 16),
(1015, 'Perfection Plumbing & Drain Cleaning Ltd. provides reliable plumbing services in Saskatoon, Saskatchewan.', 'https://www.kwikr.ca/pictures/profile/pimage-1011.jpg', '1100 7 Ave N #9', 'S7L 1M7', 'Perfection Plumbing & Drain Cleaning Ltd.', 'Addressing plumbing and drain issues since 1996 with transparent pricing and 24/7 operations.', 'https://www.kwikr.ca/pictures/profile/pimage-1011.jpg', 'https://www.perfectionplumbing.ca/', 29),
(1016, 'Rooter Man Drain Cleaning provides essential plumbing services in Saskatoon, Saskatchewan.', 'https://www.kwikr.ca/pictures/profile/pimage-1010.jpg', '502 Avenue M S', 'S7M 2K3', 'Rooter Man Drain Cleaning', 'Specializing in drain cleaning, grease trap cleaning, portable washrooms, and HVAC services.', 'https://www.kwikr.ca/pictures/profile/pimage-1010.jpg', 'https://www.saskrooterman.com/', 21),
(1017, 'Martin Dejong Plumbing & Heating Ltd. offers expert plumbing services in Lynden, Ontario.', 'https://www.kwikr.ca/pictures/profile/pimage-1008.jpg', '199 Orkney Rd', 'N0E 1N0', 'Martin Dejong Plumbing & Heating Ltd.', 'Established in 1979, specializing in commercial and residential plumbing with certified staff.', 'https://www.kwikr.ca/pictures/profile/pimage-1008.jpg', 'https://www.mdplumbing.ca/', 46),
(1018, 'Magnum Plumbing & Heating Ltd provides comprehensive plumbing and heating services in Victoria, British Columbia.', 'https://www.kwikr.ca/pictures/profile/pimage-1006.jpg', '1289 Balmoral Rd', 'V8T 1B3', 'Magnum Plumbing & Heating Ltd', 'Known for skilled professionals and reliable solutions with focus on safety and efficiency.', 'https://www.kwikr.ca/pictures/profile/pimage-1006.jpg', 'https://www.magnumplumbing.ca/', 19),
(1019, 'DRAINPRO offers comprehensive plumbing services in Nepean, Ontario, throughout Greater Ottawa Area.', 'https://www.kwikr.ca/pictures/profile/pimage-1002.jpg', '1980 Merivale Rd', 'K2G 1E6', 'DrainPro | Ottawa Plumbing Services', 'Equipped with fully loaded trucks, prepared to tackle various plumbing challenges efficiently.', 'https://www.kwikr.ca/pictures/profile/pimage-1002.jpg', 'https://www.drainpro.ca/', 23),
(1020, 'Baumann''s Ventilation & Plumbing Ltd offers essential services in residential and commercial heating, air-conditioning, and plumbing.', 'https://www.kwikr.ca/pictures/profile/pimage-997.jpg', '79 SW Dr S W', 'T1A 8E8', 'Baumann''s Ventilation & Plumbing Ltd', 'One of Canada''s most respected providers with reputation for reliability and quality in Medicine Hat.', 'https://www.kwikr.ca/pictures/profile/pimage-997.jpg', 'http://www.baumanns.ca/', 32);

-- Add services for these companies
INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES
(1001, 'Water Line Repair', 'Plumbing', 120.00, TRUE, 'Expert water line repair and replacement services'),
(1001, 'Sewer Line Replacement', 'Plumbing', 130.00, TRUE, 'Advanced sewer line repair and replacement using modern techniques'),
(1002, 'Water Heater Installation', 'Plumbing', 95.00, TRUE, 'Professional water heater installation and repair'),
(1002, 'Drain Line Camera Inspection', 'Plumbing', 125.00, TRUE, 'Camera inspections up to 250 feet for accurate diagnosis'),
(1003, 'Plumbing Repairs', 'Plumbing', 85.00, TRUE, 'Residential and commercial plumbing repair services'),
(1003, 'Gas Fitting', 'Plumbing', 110.00, TRUE, 'Professional gas fitting and installation services'),
(1004, 'Emergency Plumbing', 'Plumbing', 140.00, TRUE, '24/7 emergency plumbing repair services'),
(1004, 'Toilet Repairs', 'Plumbing', 75.00, TRUE, 'Toilet repair and replacement services'),
(1005, 'Emergency Plumbing', 'Plumbing', 135.00, TRUE, 'Emergency plumbing services available 24/7'),
(1005, 'HVAC Services', 'Heating', 105.00, TRUE, 'Heating, cooling and HVAC system maintenance'),
(1006, 'Plumbing Solutions', 'Plumbing', 90.00, TRUE, 'Comprehensive plumbing repairs and installations'),
(1006, 'Home Renovations', 'General Contracting', 80.00, TRUE, 'Complete home renovation and remodeling services'),
(1007, 'Commercial Plumbing', 'Plumbing', 95.00, TRUE, 'Commercial plumbing installation, maintenance, and repair'),
(1007, 'Residential Plumbing', 'Plumbing', 85.00, TRUE, 'Residential plumbing services and installations'),
(1008, 'Plumbing Repairs', 'Plumbing', 80.00, TRUE, 'Quality plumbing repairs for residential and commercial properties'),
(1008, 'Sewer Line Services', 'Plumbing', 110.00, TRUE, 'Complex sewer line issues and installations'),
(1009, 'Réparation Plomberie', 'Plumbing', 75.00, TRUE, 'Services de réparation de plomberie résidentielle et commerciale'),
(1009, 'Installation Sanitaire', 'Plumbing', 80.00, TRUE, 'Installation d''équipements sanitaires et de plomberie'),
(1010, 'Services Plomberie', 'Plumbing', 78.00, TRUE, 'Services de plomberie résidentielle et commerciale de qualité'),
(1010, 'Détection de Fuites', 'Plumbing', 85.00, TRUE, 'Détection et réparation de fuites avec équipement moderne'),
(1011, 'Plumbing Services', 'Plumbing', 88.00, TRUE, 'Routine maintenance to emergency repairs with highest standards'),
(1011, 'Heating Services', 'Heating', 92.00, TRUE, 'Professional heating system maintenance and installation'),
(1012, 'Plumbing Installation', 'Plumbing', 100.00, TRUE, 'New construction and renovation plumbing installations'),
(1012, 'Heating System Retrofits', 'Heating', 115.00, TRUE, 'Heating system retrofits using quality products'),
(1013, 'Mechanical Contracting', 'Plumbing', 120.00, TRUE, 'Division 15 mechanical construction for commercial projects'),
(1013, 'Plumbing Systems', 'Plumbing', 105.00, TRUE, 'Comprehensive plumbing systems for schools and hospitals'),
(1014, 'Plumbing Services', 'Plumbing', 82.00, TRUE, 'Professional plumbing services for residential and commercial'),
(1014, 'Emergency Repairs', 'Plumbing', 125.00, TRUE, 'Urgent plumbing repairs with quality and competitive pricing'),
(1015, 'Plumbing Repairs', 'Plumbing', 88.00, TRUE, 'Reliable plumbing and drain issue solutions since 1996'),
(1015, 'Drain Cleaning', 'Plumbing', 95.00, TRUE, '24/7 drain cleaning services with transparent pricing'),
(1016, 'Drain Cleaning', 'Plumbing', 85.00, TRUE, 'Professional drain cleaning with advanced equipment'),
(1016, 'Grease Trap Cleaning', 'Plumbing', 100.00, TRUE, 'Grease trap cleaning for restaurants and food establishments'),
(1017, 'Plumbing Services', 'Plumbing', 90.00, TRUE, 'Expert plumbing services for commercial and residential'),
(1017, 'Plumbing Installation', 'Plumbing', 95.00, TRUE, 'Professional plumbing installations with certified staff'),
(1018, 'Plumbing Services', 'Plumbing', 92.00, TRUE, 'Wide range of plumbing services with skilled professionals'),
(1018, 'Heating Services', 'Heating', 98.00, TRUE, 'Comprehensive heating solutions with focus on safety'),
(1019, 'Plumbing Services', 'Plumbing', 89.00, TRUE, 'Comprehensive plumbing services throughout Greater Ottawa Area'),
(1019, 'Emergency Plumbing', 'Plumbing', 125.00, TRUE, 'Prompt plumbing solutions with fully equipped service trucks'),
(1020, 'Plumbing Services', 'Plumbing', 87.00, TRUE, 'Essential residential and commercial plumbing services'),
(1020, 'HVAC Services', 'Heating', 95.00, TRUE, 'Heating, air-conditioning and ventilation services');