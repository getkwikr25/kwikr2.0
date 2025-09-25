-- Job Tracking Enhancements for Kanban Board and Progress Tracking

-- Add job status update logs for tracking progress history
CREATE TABLE IF NOT EXISTS job_status_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by INTEGER NOT NULL,
  change_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Add job progress milestones for detailed tracking
CREATE TABLE IF NOT EXISTS job_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  milestone_name TEXT NOT NULL,
  milestone_description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at DATETIME,
  completed_by INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- Add job attachments/photos for progress documentation
CREATE TABLE IF NOT EXISTS job_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  uploaded_by INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- image, document, video
  file_size INTEGER,
  description TEXT,
  milestone_id INTEGER, -- Optional link to milestone
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (milestone_id) REFERENCES job_milestones(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_status_logs_job ON job_status_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_status_logs_created ON job_status_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_job_milestones_job ON job_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_job_milestones_completed ON job_milestones(is_completed);
CREATE INDEX IF NOT EXISTS idx_job_attachments_job ON job_attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_milestone ON job_attachments(milestone_id);

-- Insert default milestones for existing and new jobs
INSERT OR IGNORE INTO job_milestones (job_id, milestone_name, milestone_description, display_order)
SELECT 
  id as job_id,
  'Job Assigned' as milestone_name,
  'Worker has been assigned to this job' as milestone_description,
  1 as display_order
FROM jobs 
WHERE status IN ('assigned', 'in_progress', 'completed');

INSERT OR IGNORE INTO job_milestones (job_id, milestone_name, milestone_description, display_order)
SELECT 
  id as job_id,
  'Work Started' as milestone_name,
  'Worker has started working on the job' as milestone_description,
  2 as display_order
FROM jobs 
WHERE status IN ('in_progress', 'completed');

INSERT OR IGNORE INTO job_milestones (job_id, milestone_name, milestone_description, display_order)
SELECT 
  id as job_id,
  'Work Completed' as milestone_name,
  'All work has been completed' as milestone_description,
  3 as display_order
FROM jobs 
WHERE status = 'completed';

-- Mark completed milestones based on current job status
UPDATE job_milestones 
SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP
WHERE job_id IN (
  SELECT id FROM jobs WHERE status IN ('assigned', 'in_progress', 'completed')
) AND milestone_name = 'Job Assigned';

UPDATE job_milestones 
SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP
WHERE job_id IN (
  SELECT id FROM jobs WHERE status IN ('in_progress', 'completed')
) AND milestone_name = 'Work Started';

UPDATE job_milestones 
SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP
WHERE job_id IN (
  SELECT id FROM jobs WHERE status = 'completed'
) AND milestone_name = 'Work Completed';