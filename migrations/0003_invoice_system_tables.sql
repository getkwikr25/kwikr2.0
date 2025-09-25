-- Invoice System Tables for Phase 3
-- Comprehensive invoicing with PDF generation and payment links

-- Main Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  job_id INTEGER,
  client_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  
  -- Invoice Details
  title TEXT NOT NULL,
  description TEXT,
  invoice_type TEXT NOT NULL DEFAULT 'standard' CHECK (invoice_type IN ('standard', 'milestone', 'recurring', 'estimate', 'quote')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'sent', 'viewed', 'approved', 'paid', 'overdue', 'cancelled', 'disputed')),
  
  -- Financial Information
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,4) DEFAULT 0.00, -- Canadian tax rates (HST/GST/PST)
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_rate DECIMAL(5,4) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Payment Information
  currency TEXT NOT NULL DEFAULT 'CAD',
  payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'e_transfer', 'cheque', 'cash')),
  payment_terms INTEGER DEFAULT 30, -- Days until due
  
  -- Dates
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  sent_date DATETIME,
  viewed_date DATETIME,
  paid_date DATETIME,
  
  -- Invoice Configuration
  template_id INTEGER DEFAULT 1,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'fr')),
  notes TEXT,
  footer_text TEXT,
  
  -- PDF and Links
  pdf_url TEXT,
  payment_link TEXT,
  payment_intent_id TEXT, -- Stripe Payment Intent ID
  
  -- Recurring Invoice Support
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
  recurring_parent_id INTEGER,
  next_invoice_date DATE,
  
  -- Metadata
  metadata TEXT, -- JSON for additional data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs(job_id),
  FOREIGN KEY (client_id) REFERENCES users(user_id),
  FOREIGN KEY (worker_id) REFERENCES users(user_id),
  FOREIGN KEY (recurring_parent_id) REFERENCES invoices(id)
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  
  -- Item Details
  item_type TEXT NOT NULL DEFAULT 'service' CHECK (item_type IN ('service', 'product', 'labor', 'material', 'expense', 'discount', 'tax')),
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  
  -- Service/Product Information
  service_category TEXT,
  unit_of_measure TEXT DEFAULT 'hours', -- hours, days, each, sq_ft, etc.
  
  -- Tax Information
  is_taxable BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL(5,4) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Milestone Connection
  milestone_id INTEGER,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES job_milestones(id)
);

-- Invoice Templates for PDF Generation
CREATE TABLE IF NOT EXISTS invoice_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'standard' CHECK (template_type IN ('standard', 'professional', 'modern', 'minimal', 'detailed')),
  
  -- Template Configuration
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00C881', -- Kwikr green
  secondary_color TEXT DEFAULT '#1a1a1a',
  font_family TEXT DEFAULT 'Arial',
  
  -- Layout Settings
  layout_config TEXT, -- JSON configuration for template layout
  header_config TEXT, -- JSON for header customization
  footer_config TEXT, -- JSON for footer customization
  
  -- Language Support
  language TEXT DEFAULT 'en',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Payment History
CREATE TABLE IF NOT EXISTS invoice_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  
  -- Payment Details
  payment_method TEXT NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_date DATETIME NOT NULL,
  payment_reference TEXT, -- Transaction ID, cheque number, etc.
  
  -- Stripe Information
  payment_intent_id TEXT,
  charge_id TEXT,
  
  -- Payment Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  -- Escrow Integration
  escrow_transaction_id INTEGER,
  
  -- Notes
  notes TEXT,
  processed_by INTEGER, -- User ID who processed the payment
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (escrow_transaction_id) REFERENCES escrow_transactions(id),
  FOREIGN KEY (processed_by) REFERENCES users(user_id)
);

-- Invoice Activity Log
CREATE TABLE IF NOT EXISTS invoice_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  
  -- Activity Details
  action TEXT NOT NULL, -- 'created', 'sent', 'viewed', 'paid', 'overdue', etc.
  description TEXT NOT NULL,
  user_id INTEGER,
  
  -- Additional Data
  old_status TEXT,
  new_status TEXT,
  metadata TEXT, -- JSON for additional data
  
  -- Client Information (for tracking views)
  client_ip TEXT,
  user_agent TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Invoice Reminders and Notifications
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  
  -- Reminder Configuration
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_soon', 'overdue', 'payment_received', 'custom')),
  days_before_due INTEGER, -- For 'due_soon' reminders
  days_after_due INTEGER, -- For 'overdue' reminders
  
  -- Scheduling
  scheduled_date DATETIME NOT NULL,
  sent_date DATETIME,
  
  -- Content
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Tax Configuration for Different Canadian Provinces
CREATE TABLE IF NOT EXISTS tax_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  province_code TEXT NOT NULL, -- AB, BC, ON, etc.
  province_name TEXT NOT NULL,
  
  -- Tax Types
  gst_rate DECIMAL(5,4) DEFAULT 0.05, -- 5% Federal GST
  pst_rate DECIMAL(5,4) DEFAULT 0.00, -- Provincial tax
  hst_rate DECIMAL(5,4), -- Harmonized tax (replaces GST+PST in some provinces)
  
  -- Tax Numbers
  gst_number TEXT,
  pst_number TEXT,
  
  -- Effective Dates
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Approval Workflow
CREATE TABLE IF NOT EXISTS invoice_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  
  -- Approval Details
  approver_id INTEGER NOT NULL,
  approval_level INTEGER DEFAULT 1, -- Multi-level approval support
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  
  -- Decision Details
  decision_date DATETIME,
  comments TEXT,
  conditions TEXT, -- Any conditions for approval
  
  -- Workflow
  required BOOLEAN DEFAULT TRUE,
  expires_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (approver_id) REFERENCES users(user_id)
);

-- Invoice Comments and Communication
CREATE TABLE IF NOT EXISTS invoice_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  
  -- Comment Details
  commenter_id INTEGER NOT NULL,
  commenter_type TEXT NOT NULL CHECK (commenter_type IN ('client', 'worker', 'admin', 'system')),
  comment TEXT NOT NULL,
  
  -- Visibility
  is_internal BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'edited', 'deleted')),
  
  -- Metadata
  edited_at DATETIME,
  edited_by INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (commenter_id) REFERENCES users(user_id),
  FOREIGN KEY (edited_by) REFERENCES users(user_id)
);

-- Invoice Attachments (receipts, contracts, etc.)
CREATE TABLE IF NOT EXISTS invoice_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  
  -- File Details
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER, -- In bytes
  
  -- Attachment Type
  attachment_type TEXT DEFAULT 'document' CHECK (attachment_type IN ('document', 'image', 'receipt', 'contract', 'other')),
  description TEXT,
  
  -- Upload Info
  uploaded_by INTEGER NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Recurring Invoice Schedules
CREATE TABLE IF NOT EXISTS recurring_invoice_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_invoice_id INTEGER NOT NULL,
  
  -- Schedule Configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
  interval_count INTEGER DEFAULT 1, -- Every X weeks/months/etc
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for indefinite
  
  -- Generation Rules
  generate_days_before INTEGER DEFAULT 0, -- Days before due date to generate
  max_invoices INTEGER, -- Maximum number to generate (NULL for unlimited)
  
  -- Current Status
  next_generation_date DATE NOT NULL,
  invoices_generated INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Last Generation
  last_generated_date DATE,
  last_invoice_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (last_invoice_id) REFERENCES invoices(id)
);

-- Invoice Analytics and Reporting
CREATE TABLE IF NOT EXISTS invoice_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Time Period
  report_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  
  -- Metrics
  total_invoices INTEGER DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0.00,
  paid_invoices INTEGER DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0.00,
  overdue_invoices INTEGER DEFAULT 0,
  overdue_amount DECIMAL(12,2) DEFAULT 0.00,
  
  -- Performance Metrics
  average_payment_time DECIMAL(8,2), -- Days
  collection_rate DECIMAL(5,4), -- Percentage
  
  -- Breakdown by Type
  standard_invoices INTEGER DEFAULT 0,
  milestone_invoices INTEGER DEFAULT 0,
  recurring_invoices INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(report_date, period_type)
);

-- Insert Default Invoice Template
INSERT OR IGNORE INTO invoice_templates (
  id, name, description, template_type, primary_color, secondary_color, 
  layout_config, is_default, is_active
) VALUES (
  1, 
  'Kwikr Professional', 
  'Professional invoice template with Kwikr branding',
  'professional',
  '#00C881',
  '#1a1a1a',
  '{"header_height": 120, "footer_height": 80, "margin": 40, "line_spacing": 1.2}',
  TRUE,
  TRUE
);

-- Insert Canadian Tax Rates (2024 rates)
INSERT OR IGNORE INTO tax_rates (province_code, province_name, gst_rate, pst_rate, hst_rate, effective_from) VALUES
('AB', 'Alberta', 0.05, 0.00, NULL, '2024-01-01'),
('BC', 'British Columbia', 0.05, 0.07, NULL, '2024-01-01'),
('MB', 'Manitoba', 0.05, 0.07, NULL, '2024-01-01'),
('NB', 'New Brunswick', NULL, NULL, 0.15, '2024-01-01'),
('NL', 'Newfoundland and Labrador', NULL, NULL, 0.15, '2024-01-01'),
('NS', 'Nova Scotia', NULL, NULL, 0.15, '2024-01-01'),
('NT', 'Northwest Territories', 0.05, 0.00, NULL, '2024-01-01'),
('NU', 'Nunavut', 0.05, 0.00, NULL, '2024-01-01'),
('ON', 'Ontario', NULL, NULL, 0.13, '2024-01-01'),
('PE', 'Prince Edward Island', NULL, NULL, 0.15, '2024-01-01'),
('QC', 'Quebec', 0.05, 0.09975, NULL, '2024-01-01'),
('SK', 'Saskatchewan', 0.05, 0.06, NULL, '2024-01-01'),
('YT', 'Yukon', 0.05, 0.00, NULL, '2024-01-01');

-- Invoice Payment Links
CREATE TABLE IF NOT EXISTS invoice_payment_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  stripe_link_id TEXT NOT NULL,
  stripe_link_url TEXT NOT NULL,
  expires_at DATETIME,
  allow_promotion_codes BOOLEAN DEFAULT FALSE,
  custom_text TEXT,
  metadata TEXT, -- JSON for additional configuration
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_worker_id ON invoices(worker_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_invoice_id ON invoice_activity_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_scheduled_date ON invoice_reminders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_status ON invoice_reminders(status);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next_generation ON recurring_invoice_schedules(next_generation_date);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_active ON recurring_invoice_schedules(is_active);

CREATE INDEX IF NOT EXISTS idx_invoice_analytics_date ON invoice_analytics(report_date);
CREATE INDEX IF NOT EXISTS idx_invoice_analytics_period ON invoice_analytics(period_type);