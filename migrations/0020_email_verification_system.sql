-- Email verification system

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  token_type TEXT DEFAULT 'email_verification' CHECK (token_type IN ('email_verification', 'password_reset', 'email_change')),
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Business verification requests table
CREATE TABLE IF NOT EXISTS business_verification_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  business_phone TEXT NOT NULL,
  business_license_number TEXT,
  business_registration_number TEXT,
  license_document_url TEXT,
  registration_document_url TEXT,
  insurance_document_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_business_verification_user_id ON business_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_business_verification_status ON business_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_business_verification_business_email ON business_verification_requests(business_email);

-- Unique constraint to prevent multiple pending verifications per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_business_verification 
ON business_verification_requests(user_id) 
WHERE status = 'pending';