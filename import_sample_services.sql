-- Import Sample Worker Services

INSERT OR IGNORE INTO worker_services (
    user_id, service_category, service_name, description, hourly_rate,
    is_available, service_area, years_experience, created_at
) VALUES 
(1000, 'Plumbing', 'Professional Plumbing Services', 'Complete plumbing installation, repair, and maintenance services', 95.00, 1, 'Burnaby, BC', 8, datetime('now')),
(1001, 'Plumbing', 'Professional Plumbing Services', 'Complete plumbing installation, repair, and maintenance services', 90.00, 1, 'Parksville, BC', 6, datetime('now')),
(1002, 'Plumbing', 'Professional Plumbing Services', 'Complete plumbing installation, repair, and maintenance services', 100.00, 1, 'North Vancouver, BC', 10, datetime('now')),
(1003, 'Plumbing', 'Professional Plumbing Services', 'Complete plumbing installation, repair, and maintenance services', 80.00, 1, 'Bracebridge, ON', 7, datetime('now')),
(1004, 'Plumbing', 'Professional Plumbing Services', 'Complete plumbing installation, repair, and maintenance services', 85.00, 1, 'Markham, ON', 12, datetime('now'));