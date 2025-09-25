-- Worker Enhancements Migration
-- Adds bid history tracking, file uploads, and enhanced profile features

-- Add bid history tracking
CREATE TABLE IF NOT EXISTS bid_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bid_id INTEGER NOT NULL,
  bid_amount DECIMAL(10,2) NOT NULL,
  cover_message TEXT,
  estimated_timeline TEXT,
  modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  modification_reason TEXT,
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE
);

-- Add file uploads for compliance documents
CREATE TABLE IF NOT EXISTS compliance_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compliance_id INTEGER NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('wsib', 'insurance', 'license', 'other')),
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (compliance_id) REFERENCES worker_compliance(id) ON DELETE CASCADE
);

-- Add bid modification tracking columns to bids table
ALTER TABLE bids ADD COLUMN is_modified BOOLEAN DEFAULT FALSE;
ALTER TABLE bids ADD COLUMN modification_count INTEGER DEFAULT 0;
ALTER TABLE bids ADD COLUMN last_modified_at DATETIME;

-- Add company information to user profiles
ALTER TABLE user_profiles ADD COLUMN company_name TEXT;
ALTER TABLE user_profiles ADD COLUMN company_description TEXT;
ALTER TABLE user_profiles ADD COLUMN company_logo_url TEXT;
ALTER TABLE user_profiles ADD COLUMN website_url TEXT;
ALTER TABLE user_profiles ADD COLUMN years_in_business INTEGER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bid_history_bid ON bid_history(bid_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_compliance ON compliance_documents(compliance_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_type ON compliance_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_bids_modified ON bids(is_modified);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_name);