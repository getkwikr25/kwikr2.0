-- Import Sample Worker Profiles

INSERT OR IGNORE INTO user_profiles (
    user_id, bio, company_name, company_description, website_url, 
    years_in_business, address_line1, postal_code, created_at
) VALUES 
(1000, 'Professional plumbing services in Burnaby, British Columbia', 'Drain Master Plumbers', 'Quality plumbing services serving Burnaby and surrounding areas', 'https://drainmastertrenchless.com/', 8, '3287 Ardingley Ave', 'V5B 4A5', datetime('now')),
(1001, 'Professional plumbing services in Parksville, British Columbia', 'Epic Plumbing and Heating', 'Quality plumbing services serving Parksville and surrounding areas', 'https://www.epicplumbingandheating.ca/', 6, '1100 Dobler Rd', 'V9P 2C5', datetime('now')),
(1002, 'Professional plumbing services in North Vancouver, British Columbia', 'R & B Plumbing & Heating Ltd.', 'Quality plumbing services serving North Vancouver and surrounding areas', 'https://randbplumbing.ca/', 10, '1075 W 1st St #104', 'V7P 3T4', datetime('now')),
(1003, 'Professional plumbing services in Bracebridge, Ontario', 'E Z Flow Plumbing', 'Quality plumbing services serving Bracebridge and surrounding areas', NULL, 7, '45 Woodland Dr', 'P1L 1M2', datetime('now')),
(1004, 'Professional plumbing services in Markham, Ontario', 'Direct Plumbing & Renovations Ltd.', 'Quality plumbing services serving Markham and surrounding areas', NULL, 12, '300 Steelcase Rd W #30', 'L3R 2W2', datetime('now'));