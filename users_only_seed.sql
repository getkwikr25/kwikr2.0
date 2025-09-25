-- Add just the users first
INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified) VALUES 
  ('alex.electric@example.com', 'd29ya2VyMTIz', 'worker', 'Alex', 'Thompson', '+1-604-555-0301', 'BC', 'Vancouver', TRUE, TRUE),
  ('sarah.cleaner@example.com', 'd29ya2VyMTIz', 'worker', 'Sarah', 'Anderson', '+1-403-555-0302', 'AB', 'Calgary', TRUE, TRUE),
  ('mike.hvac@example.com', 'd29ya2VyMTIz', 'worker', 'Mike', 'Roberts', '+1-416-555-0303', 'ON', 'Mississauga', TRUE, TRUE),
  ('emma.painter@example.com', 'd29ya2VyMTIz', 'worker', 'Emma', 'Johnson', '+1-514-555-0304', 'QC', 'Montreal', TRUE, TRUE),
  ('james.landscaper@example.com', 'd29ya2VyMTIz', 'worker', 'James', 'Wilson', '+1-902-555-0305', 'NS', 'Halifax', TRUE, TRUE),
  ('lisa.flooring@example.com', 'd29ya2VyMTIz', 'worker', 'Lisa', 'Martinez', '+1-604-555-0306', 'BC', 'Burnaby', TRUE, TRUE),
  ('tom.handyman@example.com', 'd29ya2VyMTIz', 'worker', 'Tom', 'Davis', '+1-403-555-0307', 'AB', 'Edmonton', TRUE, TRUE),
  ('anna.roofer@example.com', 'd29ya2VyMTIz', 'worker', 'Anna', 'Brown', '+1-416-555-0308', 'ON', 'Toronto', TRUE, TRUE);