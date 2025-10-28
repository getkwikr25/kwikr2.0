-- Import real Kwikr business data with corrected province codes
-- Sample of actual businesses from the complete dataset

-- Insert real businesses with proper province codes
INSERT OR REPLACE INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active, created_at) VALUES
-- Plumbing Companies
(1001, 'plumbingambulanceca@gmail.com', 'hashed_password_placeholder', 'worker', 'Plumbing', 'Ambulance', '6475679102', 'ON', 'Mississauga', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1002, 'info.kodiakplumbing@gmail.com', 'hashed_password_placeholder', 'worker', 'Kodiak', 'Plumbing', '4033275604', 'AB', 'Lethbridge', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1003, 'sales@drainmastertrenchless.com', 'hashed_password_placeholder', 'worker', 'Drain', 'Master', '1604-739-2000', 'BC', 'Burnaby', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1004, 'Dylan@epicplumbingandheating.ca', 'hashed_password_placeholder', 'worker', 'Epic', 'Plumbing', '1250-228-0876', 'BC', 'Parksville', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1005, 'sales@randbplumbing.ca', 'hashed_password_placeholder', 'worker', 'R&B', 'Plumbing', '1604-980-1369', 'BC', 'North Vancouver', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1006, 'sales.ezflowplumbing@gmail.com', 'hashed_password_placeholder', 'worker', 'EZ Flow', 'Plumbing', '1705-641-1773', 'ON', 'Bracebridge', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1007, 'directplumbing@rogers.com', 'hashed_password_placeholder', 'worker', 'Direct', 'Plumbing', '1249-486-5929', 'ON', 'Markham', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1008, 'service@durhampioneerplumbing.ca', 'hashed_password_placeholder', 'worker', 'Pioneer', 'Plumbing', '1905-240-2290', 'ON', 'Oshawa', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1009, 'helloplumber@hotmail.com', 'hashed_password_placeholder', 'worker', 'Hello', 'Plumber', '1506-476-8520', 'NB', 'Fredericton', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1010, 'kpearce@kalwest.com', 'hashed_password_placeholder', 'worker', 'Kal-West', 'Mechanical', '1250-765-6610', 'BC', 'Kelowna', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1011, 'service@instantplumbing.ca', 'hashed_password_placeholder', 'worker', 'Instant', 'Plumbing', '1403-338-1172', 'AB', 'Calgary', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1012, 'careers@perfectionplumbing.ca', 'hashed_password_placeholder', 'worker', 'Perfection', 'Plumbing', '1306-652-9556', 'SK', 'Saskatoon', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1013, 'info@saskrooterman.com', 'hashed_password_placeholder', 'worker', 'Rooter', 'Man', '1306-651-2564', 'SK', 'Saskatoon', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1014, 'info@mdplumbing.ca', 'hashed_password_placeholder', 'worker', 'Martin', 'Dejong', '1905-628-5266', 'ON', 'Lynden', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1015, 'info@plomberiedaniellalonde.com', 'hashed_password_placeholder', 'worker', 'Plomberie', 'Daniel', '1514-444-3076', 'QC', 'Sainte-Marthe-sur-le-Lac', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1016, 'info@tek-plumbing.com', 'hashed_password_placeholder', 'worker', 'TEK', 'Plumbing', '1780-402-2551', 'AB', 'Grande Prairie', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1017, 'info@plomberieericlalonde.com', 'hashed_password_placeholder', 'worker', 'Atelier', 'Plomberie', '1450-437-4411', 'QC', 'Blainville', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1018, 'harpersplumbingyyc@gmail.com', 'hashed_password_placeholder', 'worker', 'Harper''s', 'Plumbing', '1587-216-1755', 'AB', 'Calgary', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1019, 'magnumplumbing@shaw.ca', 'hashed_password_placeholder', 'worker', 'Magnum', 'Plumbing', '1343-307-9642', 'BC', 'Victoria', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1020, 'reception@capitalplumbing.ca', 'hashed_password_placeholder', 'worker', 'Capital', 'Plumbing', '1780-451-5666', 'AB', 'Edmonton', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
-- HVAC Companies
(1021, 'info@heatpumpstore.ca', 'hashed_password_placeholder', 'worker', 'Heat Pump', 'Store', '1604-434-7887', 'BC', 'Burnaby', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1022, 'info@jonmechanical.com', 'hashed_password_placeholder', 'worker', 'JON', 'Mechanical', '1403-275-3030', 'AB', 'Calgary', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1023, 'admin@reliable-hvac.ca', 'hashed_password_placeholder', 'worker', 'Reliable', 'HVAC', '1905-457-3342', 'ON', 'Mississauga', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1024, 'info@eastcoastmechanical.ca', 'hashed_password_placeholder', 'worker', 'East Coast', 'Mechanical', '1902-444-4555', 'NS', 'Halifax', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1025, 'contact@climatecareot.com', 'hashed_password_placeholder', 'worker', 'Climate Care', 'Ottawa', '1613-722-1000', 'ON', 'Ottawa', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
-- Electrical Companies  
(1026, 'info@jmaelectrical.ca', 'hashed_password_placeholder', 'worker', 'JMA', 'Electrical', '1416-948-2112', 'ON', 'Toronto', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1027, 'contact@powerlineelectric.ca', 'hashed_password_placeholder', 'worker', 'Powerline', 'Electric', '1403-279-3030', 'AB', 'Calgary', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1028, 'info@westernelectrical.bc.ca', 'hashed_password_placeholder', 'worker', 'Western', 'Electrical', '1604-681-8338', 'BC', 'Vancouver', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
-- Carpentry Companies
(1029, 'info@precisioncarpentry.ca', 'hashed_password_placeholder', 'worker', 'Precision', 'Carpentry', '1416-889-4567', 'ON', 'Toronto', TRUE, TRUE, TRUE, '2024-01-01 12:00:00'),
(1030, 'contact@mountaincarpentry.ca', 'hashed_password_placeholder', 'worker', 'Mountain', 'Carpentry', '1403-241-3344', 'AB', 'Calgary', TRUE, TRUE, TRUE, '2024-01-01 12:00:00');

-- Insert worker services for these real businesses
INSERT OR REPLACE INTO worker_services (user_id, service_category, service_name, is_available) VALUES
-- Plumbing services
(1001, 'Plumbing', 'Emergency Plumbing', TRUE),
(1002, 'Plumbing', 'Residential Plumbing', TRUE),
(1003, 'Plumbing', 'Drain Cleaning', TRUE),
(1004, 'Plumbing', 'Heating Services', TRUE),
(1005, 'Plumbing', 'Commercial Plumbing', TRUE),
(1006, 'Plumbing', 'Pipe Repair', TRUE),
(1007, 'Plumbing', 'Water Heater Installation', TRUE),
(1008, 'Plumbing', 'Bathroom Renovation', TRUE),
(1009, 'Plumbing', 'Septic Services', TRUE),
(1010, 'Plumbing', 'Mechanical Services', TRUE),
(1011, 'Plumbing', 'Emergency Repairs', TRUE),
(1012, 'Plumbing', 'Residential Services', TRUE),
(1013, 'Plumbing', 'Drain Cleaning', TRUE),
(1014, 'Plumbing', 'Commercial Services', TRUE),
(1015, 'Plumbing', 'Residential Plumbing', TRUE),
(1016, 'Plumbing', 'Industrial Plumbing', TRUE),
(1017, 'Plumbing', 'Bathroom Renovation', TRUE),
(1018, 'Plumbing', 'Emergency Services', TRUE),
(1019, 'Plumbing', 'Residential Plumbing', TRUE),
(1020, 'Plumbing', 'Commercial Plumbing', TRUE),
-- HVAC services
(1021, 'HVAC', 'Heat Pump Installation', TRUE),
(1022, 'HVAC', 'Furnace Repair', TRUE),
(1023, 'HVAC', 'Air Conditioning', TRUE),
(1024, 'HVAC', 'Heating Services', TRUE),
(1025, 'HVAC', 'Climate Control', TRUE),
-- Electrical services
(1026, 'Electrical', 'Residential Wiring', TRUE),
(1027, 'Electrical', 'Commercial Electrical', TRUE),
(1028, 'Electrical', 'Industrial Electrical', TRUE),
-- Carpentry services
(1029, 'Carpentry', 'Custom Carpentry', TRUE),
(1030, 'Carpentry', 'Finish Carpentry', TRUE);