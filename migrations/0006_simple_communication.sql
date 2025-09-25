-- Simple Communication System for Kwikr Directory
-- Simplified migration to avoid dependency issues

-- Message Threads (Conversations between clients and workers)
CREATE TABLE IF NOT EXISTS message_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'normal',
  last_message_at DATETIME,
  last_message_by INTEGER,
  client_unread_count INTEGER DEFAULT 0,
  worker_unread_count INTEGER DEFAULT 0,
  is_archived_by_client BOOLEAN DEFAULT FALSE,
  is_archived_by_worker BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual Messages
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size INTEGER,
  attachment_type TEXT,
  is_system_message BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at DATETIME,
  reply_to_message_id INTEGER,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job Progress Updates
CREATE TABLE IF NOT EXISTS job_progress_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'progress',
  title TEXT NOT NULL,
  description TEXT,
  progress_percentage INTEGER DEFAULT 0,
  milestone_id INTEGER,
  estimated_completion DATETIME,
  photos TEXT,
  before_photos TEXT,
  after_photos TEXT,
  location_notes TEXT,
  next_steps TEXT,
  client_action_required BOOLEAN DEFAULT FALSE,
  client_approval_required BOOLEAN DEFAULT FALSE,
  approved_by_client BOOLEAN DEFAULT FALSE,
  approved_at DATETIME,
  is_public BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- File Shares
CREATE TABLE IF NOT EXISTS shared_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  shared_by INTEGER NOT NULL,
  shared_with INTEGER,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  file_category TEXT DEFAULT 'general',
  description TEXT,
  is_progress_photo BOOLEAN DEFAULT FALSE,
  photo_stage TEXT,
  access_level TEXT DEFAULT 'job_participants',
  download_count INTEGER DEFAULT 0,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  related_entity_type TEXT,
  related_entity_id INTEGER,
  action_url TEXT,
  priority TEXT DEFAULT 'normal',
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  is_pushed BOOLEAN DEFAULT FALSE,
  pushed_at DATETIME,
  is_emailed BOOLEAN DEFAULT FALSE,
  emailed_at DATETIME,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quick Reply Templates
CREATE TABLE IF NOT EXISTS quick_reply_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);