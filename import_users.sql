-- Insert all Kwikr businesses as users
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, created_at) VALUES
(1, 'coastalre@kwikr.ca', 'hashed_password_placeholder', 'worker', 'Coastal', 'Owner', '+1-401-101-1001', 'ON', 'Ottawa', '2024-01-01 12:00:00'),
(2, 'precision@kwikr.ca', 'hashed_password_placeholder', 'worker', 'Precision', 'Owner', '+1-402-102-1002', 'ON', 'Hamilton', '2024-01-01 12:00:00'),
(3, 'greenthumb@kwikr.ca', 'hashed_password_placeholder', 'worker', 'GreenThumb', 'Owner', '+1-403-103-1003', 'ON', 'London', '2024-01-01 12:00:00'),
(4, 'techflows@kwikr.ca', 'hashed_password_placeholder', 'worker', 'TechFlow', 'Owner', '+1-404-104-1004', 'ON', 'Kitchener', '2024-01-01 12:00:00'),
(5, 'summitfin@kwikr.ca', 'hashed_password_placeholder', 'worker', 'Summit', 'Owner', '+1-405-105-1005', 'ON', 'Windsor', '2024-01-01 12:00:00');