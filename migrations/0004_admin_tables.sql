-- Admin management and logging tables
-- Migration: 0004_admin_tables.sql

-- User action logs for admin activities
CREATE TABLE IF NOT EXISTS user_action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL, -- 'suspend', 'activate', 'delete_soft', 'delete_permanent', 'verify', 'bulk_suspend', etc.
    reason TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User status history for tracking user account changes
CREATE TABLE IF NOT EXISTS user_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_user_id INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'active', 'suspended', 'deleted', 'verified'
    reason TEXT NOT NULL,
    changed_by INTEGER, -- admin user ID
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Compliance documents for worker verification
CREATE TABLE IF NOT EXISTS compliance_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_user_id INTEGER NOT NULL,
    document_type TEXT NOT NULL, -- 'wsib', 'insurance', 'license', 'photo_id'
    document_name TEXT NOT NULL,
    document_data TEXT, -- Base64 encoded or file path
    file_type TEXT DEFAULT 'application/pdf',
    file_size INTEGER DEFAULT 0,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    review_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by INTEGER,
    review_date DATETIME,
    review_notes TEXT,
    rejection_reason TEXT,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT FALSE
);

-- Disputes table for conflict resolution
CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL, -- User who reported the issue
    reported_user_id INTEGER, -- User being reported (optional)
    job_id INTEGER, -- Related job (optional)
    dispute_type TEXT NOT NULL, -- 'payment', 'quality', 'communication', 'safety', 'other'
    description TEXT NOT NULL,
    evidence_data TEXT, -- JSON with evidence files/links
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'investigating', 'resolved', 'closed'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    assigned_to INTEGER, -- Admin handling the dispute
    resolution_notes TEXT,
    action_taken TEXT,
    sla_deadline DATETIME, -- Service Level Agreement deadline
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Data export requests tracking
CREATE TABLE IF NOT EXISTS data_export_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    export_type TEXT NOT NULL, -- 'users', 'jobs', 'analytics', 'custom_report'
    data_types TEXT NOT NULL, -- JSON array of data types to export
    filters TEXT, -- JSON object with export filters
    format TEXT DEFAULT 'csv', -- 'csv', 'json', 'pdf'
    include_sensitive BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    filename TEXT,
    file_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    download_count INTEGER DEFAULT 0,
    last_downloaded DATETIME
);

-- Platform settings and configuration
CREATE TABLE IF NOT EXISTS platform_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Whether setting is visible to non-admins
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reviews and ratings table (if not exists from previous migrations)
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL, -- User giving the review
    reviewee_id INTEGER NOT NULL, -- User being reviewed
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_type TEXT DEFAULT 'job_completion', -- 'job_completion', 'communication', 'quality'
    is_visible BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job applications table (if not exists)
CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    application_text TEXT,
    proposed_budget DECIMAL(10,2),
    proposed_timeline TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'hired'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bids table (alias for job_applications for backward compatibility)
CREATE VIEW IF NOT EXISTS bids AS 
SELECT 
    id,
    job_id,
    worker_id,
    application_text as bid_text,
    proposed_budget as bid_amount,
    proposed_timeline,
    status,
    created_at,
    updated_at
FROM job_applications;

-- Add missing budget column to jobs table if it doesn't exist
-- This is needed for revenue calculations in admin dashboard
ALTER TABLE jobs ADD COLUMN budget DECIMAL(10,2);

-- Insert default platform settings
INSERT OR IGNORE INTO platform_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_name', 'Kwikr Directory', 'string', 'Platform display name', TRUE),
('platform_tagline', 'Connecting Canadians with trusted service providers', 'string', 'Platform tagline', TRUE),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', FALSE),
('new_registrations_enabled', 'true', 'boolean', 'Allow new user registrations', FALSE),
('payment_processing_enabled', 'true', 'boolean', 'Enable payment processing', FALSE),
('admin_email', 'admin@kwikr.ca', 'string', 'Primary admin email', FALSE),
('support_email', 'support@kwikr.ca', 'string', 'Support contact email', TRUE),
('max_file_upload_mb', '10', 'number', 'Maximum file upload size in MB', FALSE),
('session_timeout_hours', '24', 'number', 'User session timeout in hours', FALSE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_action_logs_admin_id ON user_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_target_user_id ON user_action_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_created_at ON user_action_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_status_history_target_user_id ON user_status_history(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_history_created_at ON user_status_history(created_at);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_target_user_id ON compliance_documents(target_user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_review_status ON compliance_documents(review_status);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_upload_date ON compliance_documents(upload_date);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_to ON disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at);
CREATE INDEX IF NOT EXISTS idx_disputes_sla_deadline ON disputes(sla_deadline);

CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_worker_id ON job_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at);

CREATE INDEX IF NOT EXISTS idx_platform_settings_setting_key ON platform_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_platform_settings_is_public ON platform_settings(is_public);