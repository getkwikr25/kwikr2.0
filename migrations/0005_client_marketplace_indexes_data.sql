-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location_province, location_city);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_bids_job_id ON bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_worker_id ON bids(worker_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(bid_amount);

CREATE INDEX IF NOT EXISTS idx_job_messages_sender ON job_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_job_messages_recipient ON job_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_job_messages_job ON job_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_job_messages_sent_at ON job_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_job_messages_is_read ON job_messages(is_read);

-- Insert default job categories
INSERT OR IGNORE INTO job_categories (name, description, icon_class) VALUES
('Cleaning', 'House cleaning, commercial cleaning, deep cleaning', 'fas fa-broom'),
('Plumbing', 'Pipe repair, installation, emergency plumbing', 'fas fa-wrench'),
('Electrical', 'Electrical repairs, installations, troubleshooting', 'fas fa-bolt'),
('Carpentry', 'Wood work, furniture, home repairs', 'fas fa-hammer'),
('Painting', 'Interior/exterior painting, wallpaper, staining', 'fas fa-paint-roller'),
('Flooring', 'Flooring installation, repair, refinishing', 'fas fa-layer-group'),
('HVAC', 'Heating, ventilation, air conditioning', 'fas fa-fan'),
('Landscaping', 'Gardening, lawn care, outdoor maintenance', 'fas fa-seedling'),
('Handyman', 'General repairs, maintenance, odd jobs', 'fas fa-tools'),
('Roofing', 'Roof repair, installation, inspection', 'fas fa-home'),
('Moving', 'Moving services, packing, transportation', 'fas fa-truck-moving'),
('Other', 'Other services not listed above', 'fas fa-question-circle');