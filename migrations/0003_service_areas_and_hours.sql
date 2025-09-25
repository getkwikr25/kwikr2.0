-- Service Areas and Hours of Operation Migration
-- Adds support for worker service areas and operating hours

-- Worker Service Areas table
CREATE TABLE IF NOT EXISTS worker_service_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  area_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Worker Hours of Operation table
CREATE TABLE IF NOT EXISTS worker_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, day_of_week)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_areas_user ON worker_service_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_active ON worker_service_areas(is_active);
CREATE INDEX IF NOT EXISTS idx_worker_hours_user ON worker_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_hours_day ON worker_hours(day_of_week);
CREATE INDEX IF NOT EXISTS idx_worker_hours_open ON worker_hours(is_open);

-- Insert default service areas for existing workers (if any)
INSERT OR IGNORE INTO worker_service_areas (user_id, area_name) 
SELECT id, city FROM users WHERE role = 'worker' AND city IS NOT NULL;

-- Insert default hours (9 AM - 5 PM, Monday to Friday) for existing workers
INSERT OR IGNORE INTO worker_hours (user_id, day_of_week, is_open, open_time, close_time)
SELECT u.id, d.day_num, TRUE, '09:00', '17:00'
FROM users u
CROSS JOIN (
  SELECT 1 as day_num UNION ALL  -- Monday
  SELECT 2 UNION ALL             -- Tuesday  
  SELECT 3 UNION ALL             -- Wednesday
  SELECT 4 UNION ALL             -- Thursday
  SELECT 5                       -- Friday
) d
WHERE u.role = 'worker';

-- Set weekend as closed for existing workers
INSERT OR IGNORE INTO worker_hours (user_id, day_of_week, is_open)
SELECT u.id, d.day_num, FALSE
FROM users u  
CROSS JOIN (
  SELECT 0 as day_num UNION ALL  -- Sunday
  SELECT 6                       -- Saturday
) d
WHERE u.role = 'worker';