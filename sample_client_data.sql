-- Insert sample jobs using existing schema (category_id instead of service_category)
INSERT OR IGNORE INTO jobs (
  client_id, title, description, category_id, budget_min, budget_max, 
  location_province, location_city, status, urgency
) VALUES
-- Using existing client IDs (2 and 3) and category IDs from existing job_categories
(2, 'Kitchen Deep Clean', 'Need a thorough deep cleaning of my kitchen including appliances, cabinets, and floors. Kitchen is approximately 200 sq ft.', 1, 150.00, 250.00, 'ON', 'Toronto', 'posted', 'normal'),
(2, 'Bathroom Plumbing Repair', 'Leaky faucet in master bathroom needs repair. Also need to check water pressure in shower.', 2, 100.00, 200.00, 'ON', 'Toronto', 'posted', 'high'),
(2, 'Living Room Painting', 'Paint living room walls (approx 300 sq ft). Paint will be provided, need labor only.', 6, 300.00, 500.00, 'ON', 'Toronto', 'posted', 'low'),
(3, 'Garage Organization', 'Organize and clean 2-car garage. Install shelving system and sort items.', 9, 200.00, 400.00, 'BC', 'Vancouver', 'posted', 'normal'),
(3, 'Garden Cleanup', 'Fall garden cleanup including leaf removal, pruning, and bed preparation for winter.', 8, 150.00, 300.00, 'BC', 'Vancouver', 'posted', 'normal');

-- Insert sample bids using existing worker IDs
INSERT OR IGNORE INTO bids (
  job_id, worker_id, amount, proposal, estimated_duration, availability_date, status
) VALUES
-- Get the correct job IDs by running this after the jobs are inserted
-- For now, assume jobs will have IDs starting from the next available ID

-- Sample messages using existing schema
INSERT OR IGNORE INTO messages (
  sender_id, recipient_id, job_id, subject, message
) VALUES
(2, 4, NULL, 'General Inquiry', 'Hi Emma! I am interested in your cleaning services. Do you have availability this week?'),
(4, 2, NULL, 'Re: General Inquiry', 'Hi! Yes, I have availability Thursday and Friday this week. What type of cleaning are you looking for?'),
(3, 9, NULL, 'Plumbing Question', 'Hi James, I have a leaky faucet that needs repair. When would you be available?'),
(9, 3, NULL, 'Re: Plumbing Question', 'I can come by tomorrow morning to take a look. Emergency service is available 24/7.');