-- Import Sample Worker Service Areas

INSERT OR IGNORE INTO worker_service_areas (
    user_id, area_name, is_active, created_at
) VALUES 
(1000, 'Burnaby', 1, datetime('now')),
(1000, 'Vancouver', 1, datetime('now')),
(1000, 'Richmond', 1, datetime('now')),
(1001, 'Parksville', 1, datetime('now')),
(1001, 'Nanaimo', 1, datetime('now')),
(1002, 'North Vancouver', 1, datetime('now')),
(1002, 'Vancouver', 1, datetime('now')),
(1002, 'West Vancouver', 1, datetime('now')),
(1003, 'Bracebridge', 1, datetime('now')),
(1003, 'Muskoka', 1, datetime('now')),
(1004, 'Markham', 1, datetime('now')),
(1004, 'Richmond Hill', 1, datetime('now')),
(1004, 'Vaughan', 1, datetime('now'));