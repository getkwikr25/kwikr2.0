-- Import Sample Workers (Clean Data)
-- Testing import of a few clean records

INSERT OR IGNORE INTO users (
    id, email, password_hash, password_salt, role, first_name, last_name, 
    province, city, is_verified, is_active, created_at
) VALUES 
(1000, 'sales@drainmastertrenchless.com', '1271cc75b41b92a48cd059e690437ff057b0812954a7747a9f11c2eae61732fd', 'dd48dfc1d437db52f8b49564883c1ac8', 'worker', 'Drain', 'Master', 'BC', 'Burnaby', 1, 1, datetime('now')),
(1001, 'Dylan@epicplumbingandheating.ca', '2271cc75b41b92a48cd059e690437ff057b0812954a7747a9f11c2eae61732fd', 'ed48dfc1d437db52f8b49564883c1ac8', 'worker', 'Epic', 'Plumbing', 'BC', 'Parksville', 1, 1, datetime('now')),
(1002, 'sales@randbplumbing.ca', '3271cc75b41b92a48cd059e690437ff057b0812954a7747a9f11c2eae61732fd', 'fd48dfc1d437db52f8b49564883c1ac8', 'worker', 'R B', 'Plumbing', 'BC', 'North Vancouver', 1, 1, datetime('now')),
(1003, 'sales.ezflowplumbing@gmail.com', '4271cc75b41b92a48cd059e690437ff057b0812954a7747a9f11c2eae61732fd', 'ad48dfc1d437db52f8b49564883c1ac8', 'worker', 'E Z', 'Flow', 'ON', 'Bracebridge', 1, 1, datetime('now')),
(1004, 'directplumbing@rogers.com', '5271cc75b41b92a48cd059e690437ff057b0812954a7747a9f11c2eae61732fd', 'bd48dfc1d437db52f8b49564883c1ac8', 'worker', 'Direct', 'Plumbing', 'ON', 'Markham', 1, 1, datetime('now'));