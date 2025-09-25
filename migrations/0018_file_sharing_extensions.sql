-- Additional file sharing system tables
-- Extends the file system with entity associations, download logs, and processing queues

-- File entity associations (link files to jobs, invoices, disputes, etc.)
CREATE TABLE IF NOT EXISTS file_entity_associations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('job', 'invoice', 'dispute', 'profile', 'message', 'user', 'company')),
  entity_id INTEGER NOT NULL,
  association_type TEXT DEFAULT 'attachment' CHECK(association_type IN ('attachment', 'avatar', 'logo', 'document', 'proof', 'receipt')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (file_id) REFERENCES file_metadata(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- File download logs for tracking and analytics
CREATE TABLE IF NOT EXISTS file_download_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  downloaded_by INTEGER NOT NULL,
  downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  download_method TEXT DEFAULT 'direct' CHECK(download_method IN ('direct', 'signed_url', 'stream', 'preview')),
  bytes_transferred INTEGER,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  FOREIGN KEY (file_id) REFERENCES file_metadata(id) ON DELETE CASCADE,
  FOREIGN KEY (downloaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- File processing queue for background tasks
CREATE TABLE IF NOT EXISTS file_processing_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  task_type TEXT NOT NULL CHECK(task_type IN ('virus_scan', 'thumbnail', 'preview', 'compress', 'convert')),
  priority INTEGER DEFAULT 5 CHECK(priority BETWEEN 1 AND 10),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  parameters TEXT, -- JSON parameters for the task
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  FOREIGN KEY (file_id) REFERENCES file_metadata(id) ON DELETE CASCADE
);

-- File shares for temporary sharing links
CREATE TABLE IF NOT EXISTS file_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL,
  share_type TEXT DEFAULT 'link' CHECK(share_type IN ('link', 'email', 'qr_code')),
  expires_at DATETIME,
  max_downloads INTEGER,
  download_count INTEGER DEFAULT 0,
  password_hash TEXT,
  access_log TEXT, -- JSON log of accesses
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME,
  FOREIGN KEY (file_id) REFERENCES file_metadata(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- File versions for version control
CREATE TABLE IF NOT EXISTS file_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_file_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  file_id INTEGER NOT NULL, -- Points to the actual file record
  change_description TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_current INTEGER DEFAULT 0,
  FOREIGN KEY (original_file_id) REFERENCES file_metadata(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES file_metadata(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(original_file_id, version_number)
);

-- File comments and annotations
CREATE TABLE IF NOT EXISTS file_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  annotation_data TEXT, -- JSON data for annotations (coordinates, etc.)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (file_id) REFERENCES file_metadata(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- File storage statistics
CREATE TABLE IF NOT EXISTS file_storage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  date DATE DEFAULT (date('now')),
  total_files INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,
  uploads_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  storage_quota_bytes INTEGER DEFAULT 1073741824, -- 1GB default
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_entity_associations_file_id ON file_entity_associations(file_id);
CREATE INDEX IF NOT EXISTS idx_file_entity_associations_entity ON file_entity_associations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_entity_associations_created_at ON file_entity_associations(created_at);

CREATE INDEX IF NOT EXISTS idx_file_download_logs_file_id ON file_download_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_download_logs_downloaded_by ON file_download_logs(downloaded_by);
CREATE INDEX IF NOT EXISTS idx_file_download_logs_downloaded_at ON file_download_logs(downloaded_at);

CREATE INDEX IF NOT EXISTS idx_file_processing_queue_status ON file_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_file_processing_queue_priority ON file_processing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_file_processing_queue_created_at ON file_processing_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_file_shares_token ON file_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_created_by ON file_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_file_shares_expires_at ON file_shares(expires_at);

CREATE INDEX IF NOT EXISTS idx_file_versions_original_file_id ON file_versions(original_file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_current ON file_versions(is_current);

CREATE INDEX IF NOT EXISTS idx_file_comments_file_id ON file_comments(file_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_user_id ON file_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_created_at ON file_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_file_storage_stats_user_id ON file_storage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_stats_date ON file_storage_stats(date);

-- Insert initial processing tasks for existing files (if any)
INSERT OR IGNORE INTO file_processing_queue (file_id, task_type, priority)
SELECT 
  id, 
  'virus_scan', 
  5
FROM file_metadata 
WHERE virus_scan_status = 'pending';

INSERT OR IGNORE INTO file_processing_queue (file_id, task_type, priority)
SELECT 
  id, 
  'thumbnail', 
  3
FROM file_metadata 
WHERE mime_type LIKE 'image/%' 
AND thumbnail_path IS NULL;

-- Initialize storage stats for existing users
INSERT OR IGNORE INTO file_storage_stats (user_id, date, total_files, total_size_bytes)
SELECT 
  uploaded_by,
  date('now'),
  COUNT(*),
  SUM(file_size)
FROM file_metadata 
GROUP BY uploaded_by;