-- Comprehensive Compliance System for Canadian Provincial Requirements
-- Based on Canadian Contractor Compliance Matrix

-- 1. Compliance Requirements Master Table
CREATE TABLE IF NOT EXISTS compliance_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province VARCHAR(2) NOT NULL, -- ON, BC, AB, QC, SK, MB, NS, NB, NL, PE, YT, NT, NU
    trade_type VARCHAR(50) NOT NULL, -- Cleaning Services, Plumbers, Electricians, etc.
    requirement_category VARCHAR(30) NOT NULL, -- License, Insurance, WorkersComp, Certification, Permit, Contract, Training, Other
    requirement_name VARCHAR(100) NOT NULL,
    requirement_description TEXT NOT NULL,
    is_required BOOLEAN DEFAULT 1, -- 1=Required, 0=Recommended
    
    -- Authority Information
    issuing_authority VARCHAR(100), -- ESA, TSSA, Ontario College of Trades, etc.
    regulatory_reference VARCHAR(100), -- O. Reg. 212/01, etc.
    
    -- Insurance/Coverage Amounts
    minimum_coverage_amount DECIMAL(12,2), -- For insurance requirements
    coverage_currency VARCHAR(3) DEFAULT 'CAD',
    includes_completed_operations BOOLEAN DEFAULT 0,
    
    -- Applicability
    applies_to_employees BOOLEAN DEFAULT 1,
    applies_to_subcontractors BOOLEAN DEFAULT 0,
    applies_to_commercial BOOLEAN DEFAULT 1,
    applies_to_residential BOOLEAN DEFAULT 1,
    
    -- Contract Requirements
    contract_threshold_amount DECIMAL(10,2), -- Projects over $X require contracts
    
    -- Verification
    verification_method VARCHAR(50), -- document_upload, third_party, self_attestation
    renewal_frequency_months INTEGER, -- How often renewal is required
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    
    UNIQUE(province, trade_type, requirement_category, requirement_name)
);

-- 2. Worker Compliance Records
CREATE TABLE IF NOT EXISTS worker_compliance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    requirement_id INTEGER NOT NULL,
    
    -- Document Information
    document_type VARCHAR(50), -- License, Certificate, Insurance Policy, etc.
    document_number VARCHAR(100),
    document_file_path VARCHAR(255), -- Path to uploaded document
    
    -- Validity Information
    issue_date DATE,
    expiry_date DATE,
    
    -- Status Tracking
    compliance_status VARCHAR(20) DEFAULT 'pending', -- compliant, non_compliant, pending, expired
    verification_status VARCHAR(20) DEFAULT 'unverified', -- verified, unverified, rejected
    verified_by INTEGER, -- admin user who verified
    verified_at DATETIME,
    
    -- Additional Details
    coverage_amount DECIMAL(12,2), -- For insurance records
    insurer_name VARCHAR(100),
    policy_details TEXT,
    notes TEXT,
    
    -- Risk Assessment
    risk_level VARCHAR(10) DEFAULT 'medium', -- high, medium, low
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requirement_id) REFERENCES compliance_requirements(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- 3. Compliance Status Summary (for quick lookups)
CREATE TABLE IF NOT EXISTS worker_compliance_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    province VARCHAR(2) NOT NULL,
    primary_trade VARCHAR(50) NOT NULL,
    
    -- Overall Status
    overall_compliance_status VARCHAR(20) DEFAULT 'non_compliant', -- compliant, non_compliant, partial
    compliance_percentage DECIMAL(5,2) DEFAULT 0.00, -- 0.00 to 100.00
    
    -- Risk Assessment
    overall_risk_level VARCHAR(10) DEFAULT 'high', -- high, medium, low
    
    -- Counts
    total_requirements INTEGER DEFAULT 0,
    compliant_requirements INTEGER DEFAULT 0,
    pending_requirements INTEGER DEFAULT 0,
    expired_requirements INTEGER DEFAULT 0,
    
    -- Important Dates
    last_compliance_check DATETIME,
    next_expiry_date DATE, -- Earliest expiry among all requirements
    
    -- Flags
    has_critical_missing BOOLEAN DEFAULT 1, -- Missing high-risk requirements
    has_expiring_soon BOOLEAN DEFAULT 0, -- Requirements expiring within 30 days
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Compliance Alerts and Notifications
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    requirement_id INTEGER,
    
    alert_type VARCHAR(30) NOT NULL, -- expiry_warning, missing_requirement, non_compliant, renewal_due
    alert_priority VARCHAR(10) DEFAULT 'medium', -- high, medium, low
    
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert Timing
    alert_date DATE NOT NULL,
    expiry_date DATE, -- For expiry-related alerts
    
    -- Status
    is_read BOOLEAN DEFAULT 0,
    is_resolved BOOLEAN DEFAULT 0,
    resolved_at DATETIME,
    
    -- Actions
    action_required VARCHAR(50), -- upload_document, renew_license, contact_authority
    action_url VARCHAR(255), -- Link to take action
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requirement_id) REFERENCES compliance_requirements(id)
);

-- 5. Compliance Audit Log
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    requirement_id INTEGER,
    compliance_record_id INTEGER,
    
    action_type VARCHAR(30) NOT NULL, -- status_change, document_upload, verification, expiry_check
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    
    performed_by INTEGER, -- User who performed the action
    performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    details TEXT, -- JSON or description of changes
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (requirement_id) REFERENCES compliance_requirements(id),
    FOREIGN KEY (compliance_record_id) REFERENCES worker_compliance_records(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_compliance_req_province_trade ON compliance_requirements(province, trade_type);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_user ON worker_compliance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_status ON worker_compliance_records(compliance_status);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_expiry ON worker_compliance_records(expiry_date);
CREATE INDEX IF NOT EXISTS idx_compliance_summary_user ON worker_compliance_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user ON compliance_alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_date ON compliance_alerts(alert_date);