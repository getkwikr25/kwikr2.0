-- Seed data for Kwikr Directory Platform

-- Insert job categories
INSERT OR IGNORE INTO job_categories (name, description, requires_license, requires_insurance, icon_class) VALUES 
  ('Construction', 'General construction and building work', TRUE, TRUE, 'fas fa-hard-hat'),
  ('Plumbing', 'Plumbing installation and repair', TRUE, TRUE, 'fas fa-wrench'),
  ('Electrical', 'Electrical installation and maintenance', TRUE, TRUE, 'fas fa-bolt'),
  ('HVAC', 'Heating, ventilation, and air conditioning', TRUE, TRUE, 'fas fa-fan'),
  ('Landscaping', 'Lawn care and landscaping services', FALSE, TRUE, 'fas fa-seedling'),
  ('Cleaning', 'Residential and commercial cleaning', FALSE, TRUE, 'fas fa-broom'),
  ('Moving', 'Moving and relocation services', FALSE, TRUE, 'fas fa-truck'),
  ('Handyman', 'General maintenance and repairs', FALSE, TRUE, 'fas fa-tools'),
  ('Painting', 'Interior and exterior painting', FALSE, TRUE, 'fas fa-paint-roller'),
  ('Roofing', 'Roof installation and repair', TRUE, TRUE, 'fas fa-home'),
  ('Flooring', 'Flooring installation and refinishing', FALSE, TRUE, 'fas fa-layer-group'),
  ('Carpentry', 'Custom carpentry and woodwork', FALSE, TRUE, 'fas fa-hammer');

-- Insert test admin user (password: admin123)
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, province, city, is_verified, email_verified) VALUES 
  ('admin@kwikr.ca', 'YWRtaW4xMjM=', 'admin', 'System', 'Administrator', 'ON', 'Toronto', TRUE, TRUE);

-- Insert test client users (password: client123)
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('sarah.johnson@example.com', 'Y2xpZW50MTIz', 'client', 'Sarah', 'Johnson', '+1-416-555-0101', 'ON', 'Toronto', TRUE, TRUE),
  ('mike.chen@example.com', 'Y2xpZW50MTIz', 'client', 'Mike', 'Chen', '+1-604-555-0102', 'BC', 'Vancouver', TRUE, TRUE),
  ('emma.davis@example.com', 'Y2xpZW50MTIz', 'client', 'Emma', 'Davis', '+1-403-555-0103', 'AB', 'Calgary', TRUE, TRUE);

-- Insert test worker users (password: worker123)
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('john.smith@example.com', 'd29ya2VyMTIz', 'worker', 'John', 'Smith', '+1-416-555-0201', 'ON', 'Toronto', TRUE, TRUE),
  ('maria.gonzalez@example.com', 'd29ya2VyMTIz', 'worker', 'Maria', 'Gonzalez', '+1-604-555-0202', 'BC', 'Vancouver', TRUE, TRUE),
  ('david.brown@example.com', 'd29ya2VyMTIz', 'worker', 'David', 'Brown', '+1-403-555-0203', 'AB', 'Calgary', TRUE, TRUE),
  ('lisa.wilson@example.com', 'd29ya2VyMTIz', 'worker', 'Lisa', 'Wilson', '+1-416-555-0204', 'ON', 'Ottawa', TRUE, TRUE);

-- Insert user profiles
INSERT OR IGNORE INTO user_profiles (user_id, bio, address_line1, postal_code) VALUES 
  (2, 'Homeowner looking for reliable contractors for home improvement projects.', '123 Main St', 'M5V 3A3'),
  (3, 'Property manager for several commercial buildings in Vancouver.', '456 Oak Ave', 'V6B 2M9'),
  (4, 'Small business owner seeking various maintenance services.', '789 Pine Rd', 'T2P 1J9'),
  (5, 'Licensed plumber with 10+ years of experience in residential and commercial projects.', '321 Elm St', 'M4W 1A1'),
  (6, 'Professional cleaning service specializing in post-construction cleanup.', '654 Maple Dr', 'V5K 2L4'),
  (7, 'Certified electrician with expertise in smart home installations.', '987 Cedar Blvd', 'T3C 2N7'),
  (8, 'Experienced handyman providing general maintenance and repair services.', '159 Birch Ln', 'K1A 0A6');

-- Insert worker compliance records
INSERT OR IGNORE INTO worker_compliance (
  user_id, wsib_number, wsib_valid_until, insurance_provider, insurance_policy_number, 
  insurance_valid_until, license_type, license_number, license_valid_until, 
  compliance_status, verified_at, verified_by, documents_uploaded
) VALUES 
  (5, 'ON-123456789', '2025-12-31', 'Intact Insurance', 'POL-789456123', '2025-12-31', 'Master Plumber', 'MP-ON-5678', '2025-06-30', 'verified', '2024-01-15 10:00:00', 1, TRUE),
  (6, 'BC-987654321', '2025-12-31', 'BCAA Insurance', 'POL-456789012', '2025-12-31', NULL, NULL, NULL, 'verified', '2024-01-20 14:30:00', 1, TRUE),
  (7, 'AB-456789123', '2025-12-31', 'Aviva Canada', 'POL-123456789', '2025-12-31', 'Master Electrician', 'ME-AB-9012', '2025-08-15', 'verified', '2024-02-01 09:15:00', 1, TRUE),
  (8, 'ON-789123456', '2025-12-31', 'The Co-operators', 'POL-654321987', '2025-12-31', NULL, NULL, NULL, 'verified', '2024-02-10 16:45:00', 1, TRUE);

-- Insert worker services
INSERT OR IGNORE INTO worker_services (user_id, service_category, service_name, description, hourly_rate, service_area, years_experience) VALUES 
  (5, 'Plumbing', 'Residential Plumbing', 'Complete plumbing services for homes', 85.00, '["Toronto", "Mississauga", "Brampton"]', 12),
  (5, 'Plumbing', 'Emergency Repairs', '24/7 emergency plumbing services', 120.00, '["Toronto", "Mississauga"]', 12),
  (6, 'Cleaning', 'Post-Construction Cleanup', 'Professional cleanup after construction projects', 45.00, '["Vancouver", "Burnaby", "Richmond"]', 8),
  (6, 'Cleaning', 'Commercial Cleaning', 'Regular commercial building maintenance', 35.00, '["Vancouver", "Burnaby"]', 8),
  (7, 'Electrical', 'Residential Electrical', 'Home electrical installations and repairs', 90.00, '["Calgary", "Airdrie"]', 15),
  (7, 'Electrical', 'Smart Home Setup', 'Smart home device installation and configuration', 110.00, '["Calgary"]', 5),
  (8, 'Handyman', 'General Repairs', 'Various home maintenance and repair tasks', 55.00, '["Ottawa", "Gatineau"]', 7),
  (8, 'Painting', 'Interior Painting', 'Professional interior painting services', 50.00, '["Ottawa"]', 7);

-- Insert default subscriptions (pay-as-you-go for all users)
INSERT OR IGNORE INTO subscriptions (user_id, plan_type, status, monthly_fee, per_job_fee) VALUES 
  (2, 'pay_as_you_go', 'active', 0.00, 12.00),
  (3, 'pay_as_you_go', 'active', 0.00, 12.00),
  (4, 'pay_as_you_go', 'active', 0.00, 12.00),
  (5, 'pay_as_you_go', 'active', 0.00, 12.00),
  (6, 'pay_as_you_go', 'active', 0.00, 12.00),
  (7, 'pay_as_you_go', 'active', 0.00, 12.00),
  (8, 'pay_as_you_go', 'active', 0.00, 12.00);

-- Insert sample jobs
INSERT OR IGNORE INTO jobs (
  client_id, title, description, category_id, budget_min, budget_max, urgency, 
  location_province, location_city, location_address, status, start_date, expected_completion
) VALUES 
  (2, 'Kitchen Sink Installation', 'Need a professional plumber to install a new kitchen sink and connect plumbing. All materials provided.', 2, 300.00, 500.00, 'normal', 'ON', 'Toronto', '123 Main St, Toronto', 'posted', '2025-09-01', '2025-09-02'),
  (3, 'Office Building Deep Clean', 'Post-renovation deep cleaning for a 5000 sq ft office space. Need experienced team.', 6, 2000.00, 3000.00, 'high', 'BC', 'Vancouver', '456 Oak Ave, Vancouver', 'posted', '2025-08-30', '2025-09-05'),
  (4, 'Electrical Panel Upgrade', 'Need certified electrician to upgrade electrical panel to 200 amp service for small warehouse.', 3, 1500.00, 2500.00, 'normal', 'AB', 'Calgary', '789 Pine Rd, Calgary', 'posted', '2025-09-10', '2025-09-15'),
  (2, 'Bathroom Tile Repair', 'Several loose tiles in main bathroom need professional repair and regrouting.', 8, 150.00, 300.00, 'low', 'ON', 'Toronto', '123 Main St, Toronto', 'assigned', '2025-08-25', '2025-08-27'),
  (3, 'Smart Thermostat Installation', 'Install and configure 3 smart thermostats in commercial building. Devices provided.', 3, 400.00, 600.00, 'normal', 'BC', 'Vancouver', '456 Oak Ave, Vancouver', 'in_progress', '2025-08-20', '2025-08-22');

-- Update jobs with assigned workers
UPDATE jobs SET assigned_worker_id = 8 WHERE id = 4;
UPDATE jobs SET assigned_worker_id = 7 WHERE id = 5;

-- Insert sample bids
INSERT OR IGNORE INTO bids (job_id, worker_id, bid_amount, cover_message, estimated_timeline, status) VALUES 
  (1, 5, 350.00, 'I have 12+ years of plumbing experience and can complete this installation efficiently. I provide warranty on all work.', '4-6 hours same day', 'pending'),
  (2, 6, 2500.00, 'Our team specializes in post-construction cleanup. We have all professional equipment and eco-friendly cleaning products.', '2-3 days', 'pending'),
  (3, 7, 2000.00, 'Certified Master Electrician with 15+ years experience. I can upgrade your panel safely and to code.', '1-2 days', 'pending'),
  (4, 8, 200.00, 'I can repair your tiles and regrout professionally. I have experience with bathroom renovations.', '1 day', 'accepted'),
  (5, 7, 500.00, 'I specialize in smart home installations. I can configure the thermostats and provide training.', '2 days', 'accepted');

-- Insert sample messages
INSERT OR IGNORE INTO job_messages (job_id, sender_id, recipient_id, message) VALUES 
  (4, 2, 8, 'Hi, when would be the best time for you to come assess the tile damage?'),
  (4, 8, 2, 'I can come by tomorrow morning around 9 AM if that works for you. Should take about an hour to assess.'),
  (5, 3, 7, 'The thermostats have arrived. Can you start the installation this week?'),
  (5, 7, 3, 'Perfect! I can start tomorrow. I''ll need access to the building from 8 AM to 4 PM.'),
  (5, 3, 7, 'That works great. I''ll make sure the building manager knows you''re coming.');

-- Insert sample reviews
INSERT OR IGNORE INTO reviews (job_id, reviewer_id, reviewee_id, rating, review_text) VALUES 
  (4, 2, 8, 5, 'Excellent work! David was professional, on time, and the tile repair looks perfect. Highly recommended.'),
  (5, 3, 7, 4, 'Good installation work. Lisa was knowledgeable about the smart thermostats and provided clear instructions.');

-- Insert sample notifications
INSERT OR IGNORE INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id) VALUES 
  (5, 'new_job', 'New Job Match', 'A new plumbing job in Toronto matches your services!', 'job', 1),
  (6, 'new_job', 'New Job Match', 'A cleaning job in Vancouver is looking for your services!', 'job', 2),
  (7, 'new_job', 'New Job Match', 'An electrical job in Calgary needs your expertise!', 'job', 3),
  (2, 'bid_received', 'New Bid Received', 'John Smith submitted a bid for your kitchen sink installation job.', 'bid', 1),
  (3, 'bid_received', 'New Bid Received', 'Maria Gonzalez submitted a bid for your office cleaning job.', 'bid', 2),
  (8, 'job_completed', 'Job Completed', 'Your bathroom tile repair job has been marked as completed.', 'job', 4),
  (7, 'payment_received', 'Payment Received', 'You have received payment for the smart thermostat installation job.', 'job', 5);