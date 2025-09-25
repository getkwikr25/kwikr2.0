-- Invoice Payment Dispute System
-- Complete payment dispute handling for invoices
-- Part of Phase 3: Complete Payment Integration

-- Invoice Disputes Table (for all invoice disputes including non-escrow)
CREATE TABLE IF NOT EXISTS invoice_disputes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  escrow_dispute_id INTEGER, -- NULL if standalone invoice dispute
  stripe_dispute_id TEXT, -- Stripe dispute ID for payment method disputes
  
  -- Dispute Parties
  initiated_by INTEGER NOT NULL, -- User who filed the dispute
  client_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  
  -- Dispute Classification  
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('payment_method', 'service_quality', 'billing_error', 'fraud', 'non_delivery', 'duplicate_charge', 'unauthorized', 'other')),
  dispute_category TEXT NOT NULL CHECK (dispute_category IN ('chargeback', 'refund_request', 'billing_dispute', 'service_dispute', 'fraud_claim')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Dispute Details
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  amount_disputed DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  
  -- Status and Resolution
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'awaiting_response', 'under_review', 'mediation', 'arbitration', 'resolved', 'closed', 'escalated')),
  resolution_type TEXT CHECK (resolution_type IN ('full_refund', 'partial_refund', 'chargeback_reversal', 'billing_correction', 'service_credit', 'no_action', 'split_decision')),
  resolution_amount DECIMAL(10,2),
  resolution_notes TEXT,
  
  -- Assignment and Processing
  assigned_to INTEGER, -- Admin/mediator assigned
  assigned_at DATETIME,
  
  -- Important Dates
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME, -- Response deadline
  resolved_at DATETIME,
  closed_at DATETIME,
  
  -- Metadata
  metadata TEXT, -- JSON for additional dispute-specific data
  internal_notes TEXT, -- Admin-only notes
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (escrow_dispute_id) REFERENCES disputes(id),
  FOREIGN KEY (initiated_by) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (worker_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Invoice Dispute Evidence Table
CREATE TABLE IF NOT EXISTS invoice_dispute_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispute_id INTEGER NOT NULL,
  submitted_by INTEGER NOT NULL,
  
  -- Evidence Details
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document', 'image', 'video', 'invoice_copy', 'receipt', 'communication', 'work_proof', 'contract', 'other')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Evidence Description
  title TEXT NOT NULL,
  description TEXT,
  
  -- Verification Status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER,
  verified_at DATETIME,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  metadata TEXT, -- JSON for additional evidence data
  
  FOREIGN KEY (dispute_id) REFERENCES invoice_disputes(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Invoice Dispute Messages/Communications Table
CREATE TABLE IF NOT EXISTS invoice_dispute_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispute_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER,
  
  -- Message Content
  message_type TEXT NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'system_update', 'status_change', 'resolution_offer', 'evidence_submission', 'deadline_notice')),
  subject TEXT,
  content TEXT NOT NULL,
  
  -- Message Status
  is_internal BOOLEAN DEFAULT FALSE, -- Internal admin communications
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  metadata TEXT, -- JSON for additional message data
  
  FOREIGN KEY (dispute_id) REFERENCES invoice_disputes(id),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Invoice Dispute Timeline/Activity Log
CREATE TABLE IF NOT EXISTS invoice_dispute_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispute_id INTEGER NOT NULL,
  user_id INTEGER,
  
  -- Activity Details
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'status_changed', 'evidence_added', 'message_sent', 'assigned', 'resolution_proposed', 'resolved', 'closed', 'escalated', 'payment_processed')),
  old_value TEXT,
  new_value TEXT,
  description TEXT NOT NULL,
  
  -- System vs User Actions
  is_system_action BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  metadata TEXT, -- JSON for additional activity data
  
  FOREIGN KEY (dispute_id) REFERENCES invoice_disputes(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Stripe Dispute Mappings (for payment method disputes)
CREATE TABLE IF NOT EXISTS stripe_dispute_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_dispute_id INTEGER NOT NULL UNIQUE,
  stripe_dispute_id TEXT NOT NULL UNIQUE,
  stripe_charge_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  
  -- Stripe Dispute Details
  stripe_status TEXT, -- Stripe's dispute status
  stripe_reason TEXT, -- Stripe's dispute reason
  stripe_amount INTEGER, -- Amount in cents
  stripe_currency TEXT,
  
  -- Evidence Submission
  evidence_due_by DATETIME,
  evidence_submitted BOOLEAN DEFAULT FALSE,
  evidence_submitted_at DATETIME,
  
  -- Outcomes
  stripe_outcome TEXT, -- won, lost, warning_needs_response, etc.
  outcome_reason TEXT,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  stripe_metadata TEXT, -- JSON of full Stripe dispute object
  
  FOREIGN KEY (invoice_dispute_id) REFERENCES invoice_disputes(id)
);

-- Dispute Resolution Templates
CREATE TABLE IF NOT EXISTS dispute_resolution_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL,
  dispute_type TEXT NOT NULL,
  
  -- Template Content
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  resolution_options TEXT, -- JSON array of resolution types
  
  -- Template Settings
  auto_assign BOOLEAN DEFAULT FALSE,
  default_priority TEXT DEFAULT 'medium',
  response_time_hours INTEGER DEFAULT 48,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Admin Info
  created_by INTEGER,
  
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_invoice_id ON invoice_disputes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_status ON invoice_disputes(status);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_type ON invoice_disputes(dispute_type);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_created_at ON invoice_disputes(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_assigned_to ON invoice_disputes(assigned_to);

CREATE INDEX IF NOT EXISTS idx_invoice_dispute_evidence_dispute_id ON invoice_dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_invoice_dispute_messages_dispute_id ON invoice_dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_invoice_dispute_timeline_dispute_id ON invoice_dispute_timeline(dispute_id);

CREATE INDEX IF NOT EXISTS idx_stripe_dispute_mappings_invoice_id ON stripe_dispute_mappings(invoice_dispute_id);
CREATE INDEX IF NOT EXISTS idx_stripe_dispute_mappings_stripe_id ON stripe_dispute_mappings(stripe_dispute_id);

-- Insert Default Resolution Templates
INSERT OR IGNORE INTO dispute_resolution_templates (
  template_name, dispute_type, title_template, message_template, resolution_options, response_time_hours
) VALUES 
-- Payment Method Disputes
('Chargeback Response', 'payment_method', 'Chargeback Dispute - Invoice {invoice_number}', 
'We have received a chargeback dispute for invoice {invoice_number}. Please provide evidence of service delivery and any communication with the client.', 
'["chargeback_reversal", "partial_refund", "full_refund"]', 72),

-- Service Quality Disputes  
('Service Quality Review', 'service_quality', 'Service Quality Dispute - Invoice {invoice_number}',
'A service quality dispute has been filed for invoice {invoice_number}. Please provide details about the work completed and any relevant documentation.',
'["service_credit", "partial_refund", "no_action", "rework_agreement"]', 48),

-- Billing Error Disputes
('Billing Correction', 'billing_error', 'Billing Error Report - Invoice {invoice_number}',
'A billing error has been reported for invoice {invoice_number}. Please review the invoice details and provide clarification.',
'["billing_correction", "partial_refund", "no_action"]', 24);