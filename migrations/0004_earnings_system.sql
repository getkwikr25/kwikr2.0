-- Earnings and Payment Tracking System for Kwikr Directory
-- This migration adds comprehensive earnings calculation and tracking

-- Worker Earnings Records
CREATE TABLE IF NOT EXISTS worker_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  bid_id INTEGER NOT NULL,
  earning_type TEXT NOT NULL DEFAULT 'job_completion', -- job_completion, hourly_work, bonus, penalty, adjustment
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_withheld DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  hours_worked DECIMAL(4,2), -- For hourly tracking
  hourly_rate DECIMAL(10,2), -- Rate used for calculation
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, paid, failed, disputed
  payment_method TEXT, -- bank_transfer, paypal, stripe, etc.
  payment_reference TEXT, -- External payment system reference
  paid_at DATETIME,
  tax_year INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (bid_id) REFERENCES bids(id)
);

-- Payment Transactions (for tracking actual payments)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  earning_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'payment', -- payment, refund, chargeback, adjustment
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  payment_processor TEXT, -- stripe, paypal, manual, etc.
  processor_transaction_id TEXT,
  processor_fee DECIMAL(10,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
  failure_reason TEXT,
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (earning_id) REFERENCES worker_earnings(id)
);

-- Expense Tracking (for tax and business purposes)
CREATE TABLE IF NOT EXISTS worker_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  job_id INTEGER, -- Optional: link to specific job
  expense_category TEXT NOT NULL, -- travel, materials, equipment, insurance, licenses, etc.
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  expense_date DATE NOT NULL,
  receipt_url TEXT, -- Base64 or file URL for receipt image
  is_business_expense BOOLEAN DEFAULT TRUE,
  is_tax_deductible BOOLEAN DEFAULT TRUE,
  tax_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Tax Information (for generating tax reports)
CREATE TABLE IF NOT EXISTS worker_tax_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  tax_year INTEGER NOT NULL,
  total_gross_earnings DECIMAL(12,2) DEFAULT 0.00,
  total_platform_fees DECIMAL(12,2) DEFAULT 0.00,
  total_expenses DECIMAL(12,2) DEFAULT 0.00,
  total_tax_deductible_expenses DECIMAL(12,2) DEFAULT 0.00,
  net_taxable_income DECIMAL(12,2) DEFAULT 0.00,
  estimated_tax_owed DECIMAL(10,2) DEFAULT 0.00,
  tax_documents_generated BOOLEAN DEFAULT FALSE,
  t4a_issued BOOLEAN DEFAULT FALSE, -- Canadian tax form
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(worker_id, tax_year),
  FOREIGN KEY (worker_id) REFERENCES users(id)
);

-- Invoice Generation (for professional invoicing)
CREATE TABLE IF NOT EXISTS worker_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  payment_terms TEXT DEFAULT '30 days',
  notes TEXT,
  invoice_data TEXT, -- JSON with line items, etc.
  sent_at DATETIME,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Time Tracking Records (integrated with job_time_blocks)
CREATE TABLE IF NOT EXISTS time_tracking_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  time_block_id INTEGER, -- Link to job_time_blocks
  session_start DATETIME NOT NULL,
  session_end DATETIME,
  duration_minutes INTEGER, -- Calculated duration
  hourly_rate DECIMAL(10,2),
  earnings_amount DECIMAL(10,2), -- duration * hourly_rate
  break_minutes INTEGER DEFAULT 0,
  billable BOOLEAN DEFAULT TRUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (time_block_id) REFERENCES job_time_blocks(id)
);

-- Platform Settings (for fee calculations)
CREATE TABLE IF NOT EXISTS platform_fee_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fee_type TEXT NOT NULL, -- percentage, fixed, tiered
  fee_percentage DECIMAL(5,4), -- e.g., 0.05 for 5%
  fee_fixed_amount DECIMAL(10,2),
  minimum_fee DECIMAL(10,2),
  maximum_fee DECIMAL(10,2),
  applies_to TEXT NOT NULL DEFAULT 'all', -- all, new_workers, premium, etc.
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default platform fee (5% with $2 minimum, $50 maximum)
INSERT OR IGNORE INTO platform_fee_settings 
  (fee_type, fee_percentage, minimum_fee, maximum_fee, effective_date, is_active)
VALUES 
  ('percentage', 0.05, 2.00, 50.00, '2024-01-01', TRUE);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_earnings_worker_year ON worker_earnings(worker_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_worker_earnings_job ON worker_earnings(job_id);
CREATE INDEX IF NOT EXISTS idx_worker_earnings_status ON worker_earnings(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_earning ON payment_transactions(earning_id);
CREATE INDEX IF NOT EXISTS idx_worker_expenses_worker_year ON worker_expenses(worker_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_worker_expenses_category ON worker_expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_worker_invoices_worker ON worker_invoices(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_invoices_status ON worker_invoices(status);
CREATE INDEX IF NOT EXISTS idx_time_tracking_worker_job ON time_tracking_sessions(worker_id, job_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_status ON time_tracking_sessions(status);