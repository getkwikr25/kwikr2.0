-- Enhanced Escrow System Tables for Phase 2
-- Add these tables to support enhanced escrow features

-- Job Milestones Table
CREATE TABLE IF NOT EXISTS job_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  template_id INTEGER,
  milestone_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'paid', 'disputed')),
  due_date DATETIME,
  dependencies TEXT, -- JSON array of dependent milestone IDs
  worker_notes TEXT,
  client_notes TEXT,
  submitted_at DATETIME,
  approved_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(job_id)
);

-- Milestone Payments Linking Table
CREATE TABLE IF NOT EXISTS milestone_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id INTEGER NOT NULL,
  escrow_transaction_id INTEGER NOT NULL,
  payment_intent_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'refunded')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (milestone_id) REFERENCES job_milestones(id),
  FOREIGN KEY (escrow_transaction_id) REFERENCES escrow_transactions(id)
);

-- Milestone Submissions with Attachments
CREATE TABLE IF NOT EXISTS milestone_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  notes TEXT,
  attachments TEXT, -- JSON array of file URLs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (milestone_id) REFERENCES job_milestones(id),
  FOREIGN KEY (worker_id) REFERENCES users(user_id)
);

-- Milestone Revisions
CREATE TABLE IF NOT EXISTS milestone_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  revision_notes TEXT NOT NULL,
  additional_time_hours INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (milestone_id) REFERENCES job_milestones(id),
  FOREIGN KEY (client_id) REFERENCES users(user_id)
);

-- Milestone Ratings
CREATE TABLE IF NOT EXISTS milestone_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (milestone_id) REFERENCES job_milestones(id),
  FOREIGN KEY (client_id) REFERENCES users(user_id),
  FOREIGN KEY (worker_id) REFERENCES users(user_id)
);

-- Escrow Timeline Events
CREATE TABLE IF NOT EXISTS escrow_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'payment_confirmed', 'work_submitted', 'approved', 'released', 'disputed', 'refunded', 'expired')),
  description TEXT NOT NULL,
  user_id INTEGER,
  metadata TEXT, -- JSON metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES escrow_transactions(id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Escrow Deadlines Management
CREATE TABLE IF NOT EXISTS escrow_deadlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  deadline_type TEXT NOT NULL CHECK (deadline_type IN ('approval', 'auto_release', 'dispute_resolution', 'refund', 'custom')),
  deadline_at DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
  reminder_sent BOOLEAN DEFAULT FALSE,
  escalation_level INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (transaction_id) REFERENCES escrow_transactions(id)
);

-- Escrow Activity Log (Enhanced)
CREATE TABLE IF NOT EXISTS escrow_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  metadata TEXT, -- JSON metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES escrow_transactions(id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Milestone Activity Log
CREATE TABLE IF NOT EXISTS milestone_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  milestone_id INTEGER,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(job_id),
  FOREIGN KEY (milestone_id) REFERENCES job_milestones(id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Escrow Scheduling for Automated Tasks
CREATE TABLE IF NOT EXISTS escrow_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'auto_release', 'send_reminder', etc.
  scheduled_at DATETIME NOT NULL,
  reason TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processed_at DATETIME,
  result TEXT, -- JSON result of the action
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES escrow_transactions(id)
);

-- Dispute Cases
CREATE TABLE IF NOT EXISTS dispute_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  escrow_transaction_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  initiated_by INTEGER NOT NULL,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('quality', 'timeline', 'payment', 'requirements', 'communication', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mediation', 'arbitration', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_disputed DECIMAL(10,2) NOT NULL,
  resolution_type TEXT CHECK (resolution_type IN ('full_refund', 'partial_refund', 'full_release', 'partial_release', 'rework', 'split_decision')),
  resolution_amount DECIMAL(10,2),
  resolution_notes TEXT,
  assigned_mediator INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (escrow_transaction_id) REFERENCES escrow_transactions(id),
  FOREIGN KEY (job_id) REFERENCES jobs(job_id),
  FOREIGN KEY (client_id) REFERENCES users(user_id),
  FOREIGN KEY (worker_id) REFERENCES users(user_id),
  FOREIGN KEY (initiated_by) REFERENCES users(user_id),
  FOREIGN KEY (assigned_mediator) REFERENCES users(user_id)
);

-- Dispute Evidence
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispute_id INTEGER NOT NULL,
  submitted_by INTEGER NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document', 'image', 'video', 'chat_log', 'email', 'other')),
  file_url TEXT,
  description TEXT NOT NULL,
  metadata TEXT, -- JSON metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispute_id) REFERENCES dispute_cases(id),
  FOREIGN KEY (submitted_by) REFERENCES users(user_id)
);

-- Dispute Messages
CREATE TABLE IF NOT EXISTS dispute_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispute_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'worker', 'mediator', 'admin', 'system')),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispute_id) REFERENCES dispute_cases(id),
  FOREIGN KEY (sender_id) REFERENCES users(user_id)
);

-- Mediation Sessions
CREATE TABLE IF NOT EXISTS mediation_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispute_id INTEGER NOT NULL,
  mediator_id INTEGER NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  meeting_url TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispute_id) REFERENCES dispute_cases(id),
  FOREIGN KEY (mediator_id) REFERENCES users(user_id)
);

-- Mediators Table
CREATE TABLE IF NOT EXISTS mediators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  specializations TEXT NOT NULL, -- JSON array of dispute types
  max_case_value DECIMAL(10,2) NOT NULL DEFAULT 50000,
  rating DECIMAL(3,2) DEFAULT 5.00,
  cases_resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Dispute Activity Log
CREATE TABLE IF NOT EXISTS dispute_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispute_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispute_id) REFERENCES dispute_cases(id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Dispute Scheduling for Automated Escalation
CREATE TABLE IF NOT EXISTS dispute_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispute_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'escalate_to_mediation', 'escalate_to_arbitration', etc.
  scheduled_at DATETIME NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at DATETIME,
  result TEXT, -- JSON result of the action
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispute_id) REFERENCES dispute_cases(id)
);

-- Escrow Alerts for Monitoring
CREATE TABLE IF NOT EXISTS escrow_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER, -- Can be NULL for system-wide alerts
  alert_type TEXT NOT NULL CHECK (alert_type IN ('deadline_approaching', 'overdue', 'payment_failed', 'dispute_escalated', 'suspicious_activity', 'high_risk')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolved_by INTEGER,
  metadata TEXT, -- JSON metadata
  FOREIGN KEY (transaction_id) REFERENCES escrow_transactions(id),
  FOREIGN KEY (resolved_by) REFERENCES users(user_id)
);

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channels TEXT NOT NULL, -- JSON array of notification channels
  frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  categories TEXT NOT NULL, -- JSON array of notification categories
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Notification Queue for Delayed Delivery
CREATE TABLE IF NOT EXISTS notification_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT, -- JSON metadata
  scheduled_for DATETIME NOT NULL,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_job_milestones_job_id ON job_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_job_milestones_status ON job_milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestone_payments_milestone_id ON milestone_payments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_payments_escrow_id ON milestone_payments(escrow_transaction_id);

CREATE INDEX IF NOT EXISTS idx_escrow_timeline_transaction_id ON escrow_timeline(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_timeline_event_type ON escrow_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_escrow_deadlines_transaction_id ON escrow_deadlines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_deadlines_status ON escrow_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_escrow_deadlines_deadline_at ON escrow_deadlines(deadline_at);

CREATE INDEX IF NOT EXISTS idx_dispute_cases_escrow_id ON dispute_cases(escrow_transaction_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_status ON dispute_cases(status);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_assigned_mediator ON dispute_cases(assigned_mediator);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

CREATE INDEX IF NOT EXISTS idx_escrow_alerts_transaction_id ON escrow_alerts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_alerts_severity ON escrow_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_escrow_alerts_triggered_at ON escrow_alerts(triggered_at);

CREATE INDEX IF NOT EXISTS idx_escrow_schedule_scheduled_at ON escrow_schedule(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_escrow_schedule_processed ON escrow_schedule(processed);
CREATE INDEX IF NOT EXISTS idx_dispute_schedule_scheduled_at ON dispute_schedule(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_dispute_schedule_processed ON dispute_schedule(processed);