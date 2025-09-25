-- Add services for new workers
-- Alex (ID 18) - Electrician in Vancouver, BC
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (18, 'Electrical', 'Electrical Repairs', 'Professional electrical repairs and troubleshooting', 85.00, TRUE, 8),
  (18, 'Electrical', 'Panel Upgrades', 'Electrical panel upgrades and installations', 95.00, TRUE, 8);

-- Sarah (ID 19) - Cleaner in Calgary, AB
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (19, 'Cleaning', 'House Cleaning', 'Thorough residential cleaning services', 35.00, TRUE, 5),
  (19, 'Cleaning', 'Office Cleaning', 'Professional commercial cleaning services', 40.00, TRUE, 5);

-- Mike (ID 20) - HVAC in Mississauga, ON
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (20, 'HVAC', 'Furnace Repair', 'Furnace maintenance and repair services', 90.00, TRUE, 12),
  (20, 'HVAC', 'Air Conditioning', 'AC installation and maintenance', 85.00, TRUE, 12);

-- Emma (ID 21) - Painter in Montreal, QC
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (21, 'Painting', 'Interior Painting', 'Professional interior painting services', 45.00, TRUE, 6),
  (21, 'Painting', 'Exterior Painting', 'High-quality exterior painting and staining', 50.00, TRUE, 6);

-- James (ID 22) - Landscaper in Halifax, NS
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (22, 'Landscaping', 'Garden Design', 'Custom landscape design and planning', 65.00, TRUE, 10),
  (22, 'Landscaping', 'Lawn Maintenance', 'Regular lawn care and maintenance services', 35.00, TRUE, 10);

-- Lisa (ID 23) - Flooring in Burnaby, BC
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (23, 'Flooring', 'Hardwood Installation', 'Professional hardwood flooring installation', 75.00, TRUE, 9),
  (23, 'Flooring', 'Laminate Installation', 'Quality laminate flooring services', 55.00, TRUE, 9);

-- Tom (ID 24) - Handyman in Edmonton, AB
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (24, 'Handyman', 'General Repairs', 'Home maintenance and general repairs', 55.00, TRUE, 15),
  (24, 'Handyman', 'Furniture Assembly', 'Professional furniture assembly services', 45.00, TRUE, 15);

-- Anna (ID 25) - Roofer in Toronto, ON
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, is_available, years_experience) VALUES
  (25, 'Roofing', 'Roof Repair', 'Professional roofing repairs and maintenance', 95.00, TRUE, 7),
  (25, 'Roofing', 'Roof Installation', 'Complete roofing installation services', 105.00, TRUE, 7);