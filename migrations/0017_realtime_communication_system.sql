-- Real-time Communication System for Kwikr Platform
-- Comprehensive messaging, file sharing, and notification system
-- Phase 4: Real-time Communication

-- Conversations Table (Thread container for all messages)
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Conversation Metadata
  title TEXT, -- Optional conversation title
  conversation_type TEXT NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'job', 'invoice', 'dispute', 'support', 'group')),
  
  -- Context References (what this conversation is about)
  job_id INTEGER, -- NULL for general conversations
  invoice_id INTEGER, -- NULL unless invoice-related
  dispute_id INTEGER, -- NULL unless dispute-related
  project_id INTEGER, -- For future project management
  
  -- Participants
  client_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  admin_id INTEGER, -- NULL unless admin is involved
  
  -- Conversation Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Privacy and Moderation
  is_private BOOLEAN DEFAULT TRUE,
  is_encrypted BOOLEAN DEFAULT FALSE, -- For future E2E encryption
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'flagged', 'blocked')),
  
  -- Activity Tracking
  last_message_at DATETIME,
  last_message_by INTEGER,
  total_messages INTEGER DEFAULT 0,
  unread_count_client INTEGER DEFAULT 0,
  unread_count_worker INTEGER DEFAULT 0,
  unread_count_admin INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME,
  
  -- Metadata
  metadata TEXT, -- JSON for additional conversation data
  
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (dispute_id) REFERENCES invoice_disputes(id),
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (worker_id) REFERENCES users(id),
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (last_message_by) REFERENCES users(id)
);

-- Messages Table (Individual messages within conversations)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER, -- NULL for group messages
  
  -- Message Content
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'voice', 'video', 'location', 'system', 'notification', 'quote', 'invoice_link')),
  content TEXT NOT NULL, -- Message text or file description
  formatted_content TEXT, -- HTML formatted content
  
  -- Message Properties
  is_system_message BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  edit_count INTEGER DEFAULT 0,
  original_message_id INTEGER, -- For replies/threads
  
  -- File Attachments (for file messages)
  attachment_count INTEGER DEFAULT 0,
  
  -- Message Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sending', 'sent', 'delivered', 'read', 'failed', 'deleted')),
  
  -- Privacy and Moderation
  is_private BOOLEAN DEFAULT FALSE,
  is_encrypted BOOLEAN DEFAULT FALSE,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'flagged', 'blocked')),
  moderation_reason TEXT,
  
  -- Read Receipts
  delivered_at DATETIME,
  read_at DATETIME,
  read_by TEXT, -- JSON array of user IDs who read the message
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at DATETIME,
  deleted_at DATETIME,
  
  -- Metadata
  client_metadata TEXT, -- JSON for client-specific data (read receipts, etc.)
  server_metadata TEXT, -- JSON for server-side metadata
  
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (original_message_id) REFERENCES messages(id)
);

-- Message Attachments Table (Files, images, documents)
CREATE TABLE IF NOT EXISTS message_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL,
  uploaded_by INTEGER NOT NULL,
  
  -- File Information
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- Size in bytes
  mime_type TEXT NOT NULL,
  file_extension TEXT,
  
  -- Storage Information
  storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2' CHECK (storage_provider IN ('cloudflare_r2', 'external_url', 'base64_embed')),
  file_url TEXT NOT NULL, -- Full URL to the file
  thumbnail_url TEXT, -- Thumbnail for images/videos
  storage_path TEXT, -- Internal storage path
  
  -- File Classification
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('document', 'image', 'video', 'audio', 'archive', 'other')),
  is_sensitive BOOLEAN DEFAULT FALSE, -- Requires authentication to view
  
  -- Processing Status
  processing_status TEXT DEFAULT 'uploaded' CHECK (processing_status IN ('uploading', 'uploaded', 'processing', 'ready', 'failed')),
  virus_scan_status TEXT DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  
  -- Access Control
  is_public BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  last_accessed DATETIME,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- Optional expiration date
  
  -- Metadata
  metadata TEXT, -- JSON for additional file metadata (dimensions, duration, etc.)
  
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Message Reactions Table (Emojis, likes, etc.)
CREATE TABLE IF NOT EXISTS message_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL,
  
  -- Reaction Details
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'sad', 'angry', 'thumbs_up', 'thumbs_down', 'custom')),
  emoji TEXT, -- Actual emoji character or custom emoji ID
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  
  -- Ensure one reaction per user per message
  UNIQUE(message_id, user_id)
);

-- Real-time Communication Sessions (For presence/online status)
CREATE TABLE IF NOT EXISTS communication_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  -- Session Information
  session_token TEXT NOT NULL UNIQUE,
  connection_id TEXT, -- WebSocket connection ID or similar
  device_info TEXT, -- Browser/device information
  ip_address TEXT,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Current Context
  current_conversation_id INTEGER, -- Which conversation they're viewing
  is_typing_in_conversation INTEGER, -- Which conversation they're typing in
  typing_started_at DATETIME,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- Session expiration
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (current_conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (is_typing_in_conversation) REFERENCES conversations(id)
);

-- Enhanced Notifications System
CREATE TABLE IF NOT EXISTS communication_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  -- Notification Source
  source_type TEXT NOT NULL CHECK (source_type IN ('message', 'conversation', 'system', 'job', 'invoice', 'dispute', 'file_share')),
  source_id INTEGER, -- ID of the source entity
  conversation_id INTEGER, -- Related conversation
  message_id INTEGER, -- Related message
  
  -- Notification Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  action_text TEXT, -- Text for action button
  action_url TEXT, -- URL for action
  
  -- Notification Properties
  notification_type TEXT NOT NULL CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'message', 'reminder')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Delivery Channels
  send_email BOOLEAN DEFAULT FALSE,
  send_sms BOOLEAN DEFAULT FALSE,
  send_push BOOLEAN DEFAULT TRUE,
  send_in_app BOOLEAN DEFAULT TRUE,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'dismissed', 'failed')),
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  
  -- Delivery Tracking
  email_sent_at DATETIME,
  sms_sent_at DATETIME,
  push_sent_at DATETIME,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_for DATETIME, -- For delayed notifications
  expires_at DATETIME,
  
  -- Metadata
  metadata TEXT, -- JSON for additional notification data
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- User Communication Preferences
CREATE TABLE IF NOT EXISTS communication_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  
  -- Message Preferences
  allow_direct_messages BOOLEAN DEFAULT TRUE,
  allow_job_messages BOOLEAN DEFAULT TRUE,
  allow_marketing_messages BOOLEAN DEFAULT FALSE,
  auto_archive_old_conversations BOOLEAN DEFAULT FALSE,
  auto_archive_days INTEGER DEFAULT 90,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,
  
  -- Notification Types
  notify_new_message BOOLEAN DEFAULT TRUE,
  notify_job_updates BOOLEAN DEFAULT TRUE,
  notify_invoice_updates BOOLEAN DEFAULT TRUE,
  notify_dispute_updates BOOLEAN DEFAULT TRUE,
  notify_file_shared BOOLEAN DEFAULT TRUE,
  
  -- Notification Schedule
  quiet_hours_start TIME, -- e.g., '22:00'
  quiet_hours_end TIME, -- e.g., '08:00'
  timezone TEXT DEFAULT 'America/Toronto',
  
  -- Privacy Settings
  show_online_status BOOLEAN DEFAULT TRUE,
  show_read_receipts BOOLEAN DEFAULT TRUE,
  show_typing_indicators BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Communication Analytics and Insights
CREATE TABLE IF NOT EXISTS communication_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Analytics Period
  date DATE NOT NULL,
  hour INTEGER, -- 0-23 for hourly analytics
  
  -- User Segmentation
  user_id INTEGER, -- NULL for platform-wide analytics
  user_type TEXT, -- 'client', 'worker', 'admin'
  
  -- Message Metrics
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  conversations_started INTEGER DEFAULT 0,
  conversations_closed INTEGER DEFAULT 0,
  
  -- File Sharing Metrics
  files_shared INTEGER DEFAULT 0,
  total_file_size_mb DECIMAL(10,2) DEFAULT 0,
  
  -- Response Time Metrics (in minutes)
  avg_response_time_minutes DECIMAL(8,2),
  median_response_time_minutes DECIMAL(8,2),
  
  -- Engagement Metrics
  active_conversations INTEGER DEFAULT 0,
  time_spent_messaging_minutes INTEGER DEFAULT 0,
  
  -- Quality Metrics
  messages_flagged INTEGER DEFAULT 0,
  conversations_escalated INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  
  -- Unique constraint for analytics periods
  UNIQUE(date, hour, user_id, user_type)
);

-- Message Templates (For quick responses and system messages)
CREATE TABLE IF NOT EXISTS message_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Template Information
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('quick_response', 'system_message', 'auto_reply', 'notification')),
  category TEXT, -- e.g., 'job_completion', 'payment_reminder', etc.
  
  -- Template Content
  title TEXT,
  content TEXT NOT NULL,
  formatted_content TEXT, -- HTML version
  
  -- Usage Scope
  user_type TEXT CHECK (user_type IN ('client', 'worker', 'admin', 'system', 'any')),
  is_system_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Personalization
  supports_variables BOOLEAN DEFAULT TRUE, -- {client_name}, {job_title}, etc.
  variables_schema TEXT, -- JSON schema for available variables
  
  -- Usage Statistics
  usage_count INTEGER DEFAULT 0,
  last_used DATETIME,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(client_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_conversations_context ON conversations(job_id, invoice_id, dispute_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status, last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status, message_type);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages(content); -- For text search

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_type ON message_attachments(attachment_type, mime_type);
CREATE INDEX IF NOT EXISTS idx_message_attachments_user ON message_attachments(uploaded_by, created_at);

CREATE INDEX IF NOT EXISTS idx_communication_sessions_user ON communication_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_communication_sessions_activity ON communication_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_communication_sessions_conversation ON communication_sessions(current_conversation_id);

CREATE INDEX IF NOT EXISTS idx_communication_notifications_user ON communication_notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_communication_notifications_type ON communication_notifications(notification_type, created_at);
CREATE INDEX IF NOT EXISTS idx_communication_notifications_conversation ON communication_notifications(conversation_id);

CREATE INDEX IF NOT EXISTS idx_communication_analytics_date ON communication_analytics(date, hour);
CREATE INDEX IF NOT EXISTS idx_communication_analytics_user ON communication_analytics(user_id, date);

-- Insert Default Communication Preferences for Existing Users
INSERT OR IGNORE INTO communication_preferences (user_id)
SELECT id FROM users WHERE role IN ('client', 'worker');

-- Insert Default Message Templates
INSERT OR IGNORE INTO message_templates (template_name, template_type, category, content, user_type, is_system_template, variables_schema) VALUES 
-- Quick Response Templates
('Job Accepted', 'quick_response', 'job_management', 'Thanks for choosing me for this job! I''ve accepted your request and will start working on {job_title}. Expected completion: {completion_date}.', 'worker', TRUE, '{"job_title": "string", "completion_date": "date"}'),
('More Information Needed', 'quick_response', 'job_clarification', 'Hi! I need some additional information about {job_title}. Could you please provide more details about: {required_details}?', 'worker', TRUE, '{"job_title": "string", "required_details": "string"}'),
('Invoice Sent', 'quick_response', 'billing', 'I''ve sent you an invoice for {job_title}. Invoice #{invoice_number} for ${amount} is ready for payment. You can pay it here: {payment_link}', 'worker', TRUE, '{"job_title": "string", "invoice_number": "string", "amount": "number", "payment_link": "url"}'),
('Job Complete', 'quick_response', 'job_completion', 'Great news! I''ve completed {job_title}. Please review the work and let me know if you''re satisfied. Payment can be released when you''re happy with the results.', 'worker', TRUE, '{"job_title": "string"}'),

-- Client Templates
('Job Details', 'quick_response', 'job_management', 'Hi! Here are the details for the job: {job_details}. Please let me know if you have any questions or need clarification.', 'client', TRUE, '{"job_details": "string"}'),
('Payment Confirmed', 'quick_response', 'billing', 'Payment confirmed for invoice #{invoice_number}. Thank you for the great work on {job_title}!', 'client', TRUE, '{"invoice_number": "string", "job_title": "string"}'),
('Review Request', 'quick_response', 'job_completion', 'Could you please provide a few more details about {item_description}? I want to make sure everything meets expectations.', 'client', TRUE, '{"item_description": "string"}'),

-- System Templates
('Welcome Message', 'system_message', 'onboarding', 'Welcome to Kwikr! This is your communication center where you can chat with clients/workers, share files, and stay updated on your projects.', 'any', TRUE, '{}'),
('Job Started Notification', 'notification', 'job_management', 'Work has started on your job: {job_title}. You can communicate directly with {worker_name} here.', 'client', TRUE, '{"job_title": "string", "worker_name": "string"}'),
('Dispute Created', 'system_message', 'dispute_management', 'A dispute has been created for {entity_type} #{entity_number}. Our team will review and respond within 48 hours.', 'any', TRUE, '{"entity_type": "string", "entity_number": "string"}');

-- Insert Sample Analytics Data (optional)
INSERT OR IGNORE INTO communication_analytics (date, user_type, messages_sent, messages_received, conversations_started) VALUES 
(date('now'), 'client', 0, 0, 0),
(date('now'), 'worker', 0, 0, 0),
(date('now'), 'admin', 0, 0, 0);