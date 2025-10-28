-- Simple Kwikr Database Setup with Working HVAC Data
-- This file contains the minimal schema and test data needed for search functionality

-- Users table (service providers)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    role TEXT DEFAULT 'worker',
    is_active INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Worker profiles 
CREATE TABLE IF NOT EXISTS worker_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    bio TEXT,
    profile_image_url TEXT,
    hourly_rate DECIMAL(10,2),
    years_experience INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Worker services
CREATE TABLE IF NOT EXISTS worker_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_category TEXT NOT NULL,
    service_name TEXT NOT NULL,
    is_available INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert HVAC test workers
INSERT OR REPLACE INTO users (id, first_name, last_name, email, phone, city, province, role, is_active, is_verified) VALUES 
(1, 'Kevin', 'Brown', 'kevin.brown@example.com', '+1-403-555-0123', 'Calgary', 'AB', 'worker', 1, 1),
(2, 'Lisa', 'Anderson', 'lisa.anderson@example.com', '+1-604-555-0456', 'Vancouver', 'BC', 'worker', 1, 1),
(3, 'Mark', 'Johnson', 'mark.johnson@example.com', '+1-416-555-0789', 'Toronto', 'ON', 'worker', 1, 1);

-- Insert worker profiles
INSERT OR REPLACE INTO worker_profiles (user_id, bio, profile_image_url, hourly_rate, years_experience) VALUES 
(1, 'Experienced HVAC technician specializing in residential and commercial installations. Licensed and insured with 8+ years experience.', '/static/avatars/kevin-brown.jpg', 95.00, 8),
(2, 'Certified HVAC professional with expertise in energy-efficient systems and heat pumps. Serving Vancouver and surrounding areas.', '/static/avatars/lisa-anderson.jpg', 105.00, 12),
(3, 'HVAC specialist focusing on commercial systems and emergency repairs. Available 24/7 for urgent heating and cooling needs.', '/static/avatars/mark-johnson.jpg', 110.00, 15);

-- Insert HVAC services
INSERT OR REPLACE INTO worker_services (user_id, service_category, service_name, is_available) VALUES 
(1, 'HVAC', 'Heating System Installation', 1),
(1, 'HVAC', 'Air Conditioning Repair', 1),
(1, 'HVAC', 'Furnace Maintenance', 1),
(2, 'HVAC', 'Heat Pump Installation', 1),
(2, 'HVAC', 'Energy Efficiency Consulting', 1),
(2, 'HVAC', 'Duct Cleaning', 1),
(3, 'HVAC', 'Commercial HVAC Systems', 1),
(3, 'HVAC', 'Emergency Repairs', 1),
(3, 'HVAC', '24/7 Service Calls', 1);

-- Add some plumbing workers to test filtering
INSERT OR REPLACE INTO users (id, first_name, last_name, email, phone, city, province, role, is_active, is_verified) VALUES 
(4, 'Sarah', 'Wilson', 'sarah.wilson@example.com', '+1-403-555-1111', 'Calgary', 'AB', 'worker', 1, 1),
(5, 'David', 'Lee', 'david.lee@example.com', '+1-604-555-2222', 'Vancouver', 'BC', 'worker', 1, 1);

INSERT OR REPLACE INTO worker_profiles (user_id, bio, profile_image_url, hourly_rate, years_experience) VALUES 
(4, 'Professional plumber with expertise in residential and commercial plumbing systems.', '/static/avatars/sarah-wilson.jpg', 85.00, 6),
(5, 'Licensed plumber specializing in green plumbing solutions and water conservation.', '/static/avatars/david-lee.jpg', 90.00, 10);

INSERT OR REPLACE INTO worker_services (user_id, service_category, service_name, is_available) VALUES 
(4, 'Plumbing', 'Pipe Installation', 1),
(4, 'Plumbing', 'Drain Cleaning', 1),
(5, 'Plumbing', 'Water Heater Repair', 1),
(5, 'Plumbing', 'Eco-Friendly Plumbing', 1);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_province ON users(province);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_worker_services_category ON worker_services(service_category);
CREATE INDEX IF NOT EXISTS idx_worker_services_user_available ON worker_services(user_id, is_available);