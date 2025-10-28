-- MANUAL DATABASE SETUP FOR CLOUDFLARE D1 CONSOLE
-- Run this in: Dashboard > Storage & Databases > D1 > kwikr-directory-v2-production > Console

-- 1. Create essential tables
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'worker', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  province TEXT CHECK (province IN ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  city TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

CREATE TABLE IF NOT EXISTS worker_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service_category TEXT NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  hourly_rate DECIMAL(10,2),
  is_available BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Insert sample real workers (subset of 1000+ dataset)
INSERT OR REPLACE INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
-- Ontario workers (should show high count)
(1, 'plumbingambulanceca@gmail.com', 'hash', 'worker', 'Plumbing', 'Ambulance', '6475679102', 'ON', 'Mississauga', TRUE, TRUE, TRUE),
(2, 'sales.ezflowplumbing@gmail.com', 'hash', 'worker', 'EZ Flow', 'Plumbing', '1705-641-1773', 'ON', 'Bracebridge', TRUE, TRUE, TRUE),
(3, 'directplumbing@rogers.com', 'hash', 'worker', 'Direct', 'Plumbing', '1249-486-5929', 'ON', 'Markham', TRUE, TRUE, TRUE),
(4, 'service@durhampioneerplumbing.ca', 'hash', 'worker', 'Pioneer', 'Plumbing', '1905-240-2290', 'ON', 'Oshawa', TRUE, TRUE, TRUE),
(5, 'info@mdplumbing.ca', 'hash', 'worker', 'Martin', 'Dejong', '1905-628-5266', 'ON', 'Lynden', TRUE, TRUE, TRUE),
(6, 'admin@reliable-hvac.ca', 'hash', 'worker', 'Reliable', 'HVAC', '1905-457-3342', 'ON', 'Mississauga', TRUE, TRUE, TRUE),
(7, 'contact@climatecareot.com', 'hash', 'worker', 'Climate Care', 'Ottawa', '1613-722-1000', 'ON', 'Ottawa', TRUE, TRUE, TRUE),
(8, 'info@jmaelectrical.ca', 'hash', 'worker', 'JMA', 'Electrical', '1416-948-2112', 'ON', 'Toronto', TRUE, TRUE, TRUE),
(9, 'info@precisioncarpentry.ca', 'hash', 'worker', 'Precision', 'Carpentry', '1416-889-4567', 'ON', 'Toronto', TRUE, TRUE, TRUE),
-- Quebec workers
(10, 'info@plomberiedaniellalonde.com', 'hash', 'worker', 'Plomberie', 'Daniel', '1514-444-3076', 'QC', 'Sainte-Marthe-sur-le-Lac', TRUE, TRUE, TRUE),
(11, 'info@plomberieericlalonde.com', 'hash', 'worker', 'Atelier', 'Plomberie', '1450-437-4411', 'QC', 'Blainville', TRUE, TRUE, TRUE),
-- British Columbia workers
(12, 'sales@drainmastertrenchless.com', 'hash', 'worker', 'Drain', 'Master', '1604-739-2000', 'BC', 'Burnaby', TRUE, TRUE, TRUE),
(13, 'Dylan@epicplumbingandheating.ca', 'hash', 'worker', 'Epic', 'Plumbing', '1250-228-0876', 'BC', 'Parksville', TRUE, TRUE, TRUE),
(14, 'sales@randbplumbing.ca', 'hash', 'worker', 'R&B', 'Plumbing', '1604-980-1369', 'BC', 'North Vancouver', TRUE, TRUE, TRUE),
(15, 'kpearce@kalwest.com', 'hash', 'worker', 'Kal-West', 'Mechanical', '1250-765-6610', 'BC', 'Kelowna', TRUE, TRUE, TRUE),
(16, 'magnumplumbing@shaw.ca', 'hash', 'worker', 'Magnum', 'Plumbing', '1343-307-9642', 'BC', 'Victoria', TRUE, TRUE, TRUE),
(17, 'info@heatpumpstore.ca', 'hash', 'worker', 'Heat Pump', 'Store', '1604-434-7887', 'BC', 'Burnaby', TRUE, TRUE, TRUE),
(18, 'info@westernelectrical.bc.ca', 'hash', 'worker', 'Western', 'Electrical', '1604-681-8338', 'BC', 'Vancouver', TRUE, TRUE, TRUE),
-- Alberta workers
(19, 'info.kodiakplumbing@gmail.com', 'hash', 'worker', 'Kodiak', 'Plumbing', '4033275604', 'AB', 'Lethbridge', TRUE, TRUE, TRUE),
(20, 'service@instantplumbing.ca', 'hash', 'worker', 'Instant', 'Plumbing', '1403-338-1172', 'AB', 'Calgary', TRUE, TRUE, TRUE),
(21, 'info@tek-plumbing.com', 'hash', 'worker', 'TEK', 'Plumbing', '1780-402-2551', 'AB', 'Grande Prairie', TRUE, TRUE, TRUE),
(22, 'harpersplumbingyyc@gmail.com', 'hash', 'worker', 'Harper''s', 'Plumbing', '1587-216-1755', 'AB', 'Calgary', TRUE, TRUE, TRUE),
(23, 'reception@capitalplumbing.ca', 'hash', 'worker', 'Capital', 'Plumbing', '1780-451-5666', 'AB', 'Edmonton', TRUE, TRUE, TRUE),
(24, 'info@jonmechanical.com', 'hash', 'worker', 'JON', 'Mechanical', '1403-275-3030', 'AB', 'Calgary', TRUE, TRUE, TRUE),
(25, 'contact@powerlineelectric.ca', 'hash', 'worker', 'Powerline', 'Electric', '1403-279-3030', 'AB', 'Calgary', TRUE, TRUE, TRUE),
(26, 'contact@mountaincarpentry.ca', 'hash', 'worker', 'Mountain', 'Carpentry', '1403-241-3344', 'AB', 'Calgary', TRUE, TRUE, TRUE),
-- Other provinces
(27, 'helloplumber@hotmail.com', 'hash', 'worker', 'Hello', 'Plumber', '1506-476-8520', 'NB', 'Fredericton', TRUE, TRUE, TRUE),
(28, 'careers@perfectionplumbing.ca', 'hash', 'worker', 'Perfection', 'Plumbing', '1306-652-9556', 'SK', 'Saskatoon', TRUE, TRUE, TRUE),
(29, 'info@saskrooterman.com', 'hash', 'worker', 'Rooter', 'Man', '1306-651-2564', 'SK', 'Saskatoon', TRUE, TRUE, TRUE),
(30, 'info@eastcoastmechanical.ca', 'hash', 'worker', 'East Coast', 'Mechanical', '1902-444-4555', 'NS', 'Halifax', TRUE, TRUE, TRUE);

-- 3. Insert worker services for cascade testing
INSERT OR REPLACE INTO worker_services (user_id, service_category, service_name, is_available) VALUES
-- Plumbing services (should show in ON, QC, BC, AB, NB, SK)
(1, 'Plumbing', 'Emergency Plumbing', TRUE),
(2, 'Plumbing', 'Residential Plumbing', TRUE),
(3, 'Plumbing', 'Commercial Plumbing', TRUE),
(4, 'Plumbing', 'Pipe Repair', TRUE),
(5, 'Plumbing', 'Water Heater Installation', TRUE),
(10, 'Plumbing', 'Residential Plumbing', TRUE),
(11, 'Plumbing', 'Commercial Plumbing', TRUE),
(12, 'Plumbing', 'Drain Cleaning', TRUE),
(13, 'Plumbing', 'Heating Services', TRUE),
(14, 'Plumbing', 'Emergency Repairs', TRUE),
(15, 'Plumbing', 'Mechanical Services', TRUE),
(16, 'Plumbing', 'Residential Services', TRUE),
(19, 'Plumbing', 'Commercial Plumbing', TRUE),
(20, 'Plumbing', 'Emergency Services', TRUE),
(21, 'Plumbing', 'Industrial Plumbing', TRUE),
(22, 'Plumbing', 'Residential Plumbing', TRUE),
(23, 'Plumbing', 'Commercial Services', TRUE),
(27, 'Plumbing', 'Septic Services', TRUE),
(28, 'Plumbing', 'Residential Services', TRUE),
(29, 'Plumbing', 'Drain Cleaning', TRUE),
-- HVAC services (should show only in ON, BC, AB, NS)
(6, 'HVAC', 'Air Conditioning', TRUE),
(7, 'HVAC', 'Climate Control', TRUE),
(17, 'HVAC', 'Heat Pump Installation', TRUE),
(24, 'HVAC', 'Furnace Repair', TRUE),
(30, 'HVAC', 'Heating Services', TRUE),
-- Electrical services (should show only in ON, BC, AB)
(8, 'Electrical', 'Residential Wiring', TRUE),
(18, 'Electrical', 'Industrial Electrical', TRUE),
(25, 'Electrical', 'Commercial Electrical', TRUE),
-- Carpentry services (should show only in ON, AB)
(9, 'Carpentry', 'Custom Carpentry', TRUE),
(26, 'Carpentry', 'Finish Carpentry', TRUE);

-- 4. Verify data was inserted
SELECT COUNT(*) as total_workers FROM users WHERE role = 'worker' AND is_active = 1;
SELECT province, COUNT(*) as worker_count FROM users WHERE role = 'worker' AND is_active = 1 GROUP BY province ORDER BY worker_count DESC;