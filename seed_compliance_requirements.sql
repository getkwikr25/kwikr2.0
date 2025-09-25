-- Seed Compliance Requirements from Canadian Contractor Compliance Matrix
-- This data represents the analyzed requirements from the provided CSV

-- Insert compliance requirements for Ontario (sample of major trades)
INSERT OR IGNORE INTO compliance_requirements 
(province, trade_type, requirement_category, requirement_name, requirement_description, is_required, issuing_authority, minimum_coverage_amount, applies_to_employees, applies_to_subcontractors) VALUES

-- Ontario - Cleaning Services
('ON', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('ON', 'Cleaning Services', 'Insurance', 'General Liability Insurance', 'Minimum $1 million liability insurance', 1, 'Licensed Insurer', 1000000.00, 1, 0),
('ON', 'Cleaning Services', 'WorkersComp', 'WSIB Coverage', 'WSIB coverage required for employees', 1, 'WSIB Ontario', NULL, 1, 0),
('ON', 'Cleaning Services', 'Certification', 'WHMIS Certification', 'WHMIS certification for chemical handling', 1, 'WHMIS Training Provider', NULL, 1, 0),
('ON', 'Cleaning Services', 'Contract', 'Written Agreements', 'Written agreements for commercial services', 1, NULL, NULL, 1, 0),

-- Ontario - Plumbers
('ON', 'Plumbers', 'License', 'Plumber License', 'Journeyman or Master Plumber license from Ontario College of Trades', 1, 'Ontario College of Trades', NULL, 1, 1),
('ON', 'Plumbers', 'Insurance', 'General Liability Insurance', 'Minimum $2 million liability insurance with completed operations coverage', 1, 'Licensed Insurer', 2000000.00, 1, 1),
('ON', 'Plumbers', 'WorkersComp', 'WSIB Coverage', 'WSIB coverage required for all employees and subcontractors', 1, 'WSIB Ontario', NULL, 1, 1),
('ON', 'Plumbers', 'Certification', 'Backflow Prevention', 'Backflow prevention certification for commercial work', 1, 'Certified Training Provider', NULL, 1, 0),
('ON', 'Plumbers', 'Contract', 'Written Contracts', 'Written contracts required for all projects over $500', 1, NULL, NULL, 1, 1),

-- Ontario - Electricians
('ON', 'Electricians', 'License', 'Electrical Contractor License', 'Electrical Contractor License from ESA', 1, 'Electrical Safety Authority (ESA)', NULL, 1, 1),
('ON', 'Electricians', 'Insurance', 'General Liability Insurance', 'Minimum $2 million liability insurance', 1, 'Licensed Insurer', 2000000.00, 1, 1),
('ON', 'Electricians', 'WorkersComp', 'WSIB Coverage', 'WSIB coverage for all workers', 1, 'WSIB Ontario', NULL, 1, 1),
('ON', 'Electricians', 'Certification', 'Red Seal Endorsement', 'Red Seal endorsement for journeymen', 1, 'Red Seal Program', NULL, 1, 0),
('ON', 'Electricians', 'Permit', 'Electrical Permits', 'Permits required for all electrical work', 1, 'ESA/Municipal Authority', NULL, 1, 1),

-- Ontario - HVAC Services
('ON', 'HVAC Services', 'License', 'Gas Technician License', 'Gas Technician License from TSSA', 1, 'Technical Standards and Safety Authority (TSSA)', NULL, 1, 1),
('ON', 'HVAC Services', 'Insurance', 'General Liability Insurance', 'Minimum $2 million liability insurance', 1, 'Licensed Insurer', 2000000.00, 1, 1),
('ON', 'HVAC Services', 'WorkersComp', 'WSIB Coverage', 'WSIB coverage for employees', 1, 'WSIB Ontario', NULL, 1, 0),
('ON', 'HVAC Services', 'Certification', 'Gas Technician Certification', 'G2 or G1 Gas Technician certification', 1, 'TSSA', NULL, 1, 1),
('ON', 'HVAC Services', 'Other', 'Regulatory Compliance', 'Compliance with O. Reg. 212/01', 1, 'Government of Ontario', NULL, 1, 1),

-- Ontario - Carpenters
('ON', 'Carpenters', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('ON', 'Carpenters', 'Insurance', 'General Liability Insurance', 'General liability insurance required', 1, 'Licensed Insurer', 1000000.00, 1, 0),
('ON', 'Carpenters', 'WorkersComp', 'Workers Compensation', 'Workers compensation coverage required', 1, 'WSIB Ontario', NULL, 1, 0),
('ON', 'Carpenters', 'Certification', 'Trade Certifications', 'Trade-specific certifications may be required', 0, 'Various Authorities', NULL, 1, 0),

-- British Columbia - Plumbers
('BC', 'Plumbers', 'License', 'Plumbing License', 'Plumbing License from BC Housing', 1, 'BC Housing', NULL, 1, 1),
('BC', 'Plumbers', 'Insurance', 'General Liability Insurance', 'Minimum $2 million liability insurance', 1, 'Licensed Insurer', 2000000.00, 1, 1),
('BC', 'Plumbers', 'WorkersComp', 'WorkSafeBC Coverage', 'WorkSafeBC coverage', 1, 'WorkSafeBC', NULL, 1, 1),
('BC', 'Plumbers', 'Certification', 'Cross-Connection Control', 'Cross-connection control certification', 1, 'Certified Training Provider', NULL, 1, 0),
('BC', 'Plumbers', 'Permit', 'Plumbing Permits', 'Permits required for plumbing installations', 1, 'Municipal Authority', NULL, 1, 1),

-- Alberta - Plumbers  
('AB', 'Plumbers', 'License', 'Journeyman Plumber Certificate', 'Journeyman Plumber Certificate', 1, 'Alberta Apprenticeship and Industry Training', NULL, 1, 1),
('AB', 'Plumbers', 'Insurance', 'General Liability Insurance', 'Minimum $1 million liability insurance', 1, 'Licensed Insurer', 1000000.00, 1, 0),
('AB', 'Plumbers', 'WorkersComp', 'WCB Alberta Coverage', 'WCB Alberta coverage', 1, 'Workers Compensation Board Alberta', NULL, 1, 1),
('AB', 'Plumbers', 'Certification', 'Gasfitter Certification', 'Gasfitter certification for gas line work', 1, 'Alberta Apprenticeship and Industry Training', NULL, 1, 1),
('AB', 'Plumbers', 'Permit', 'Installation Permits', 'Permits required for new installations', 1, 'Municipal Authority', NULL, 1, 1),

-- Quebec - Plumbers
('QC', 'Plumbers', 'License', 'CCQ Certificate', 'Certificat de compétence de la CCQ', 1, 'Commission de la construction du Québec (CCQ)', NULL, 1, 1),
('QC', 'Plumbers', 'Insurance', 'Civil Liability Insurance', '$2M civil liability insurance', 1, 'Licensed Insurer', 2000000.00, 1, 1),
('QC', 'Plumbers', 'WorkersComp', 'CNESST Coverage', 'CNESST coverage mandatory', 1, 'Commission des normes, de l''equite, de la sante et de la securite du travail (CNESST)', NULL, 1, 1),
('QC', 'Plumbers', 'Certification', 'Backflow Prevention', 'Certification in prevention of backflow', 1, 'Certified Training Provider', NULL, 1, 0),
('QC', 'Plumbers', 'Permit', 'Plumbing Work Permits', 'Permits required for plumbing work', 1, 'Municipal Authority', NULL, 1, 1),

-- Universal requirements that apply to most trades across provinces
-- Municipal Business License (add for remaining provinces)
('BC', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('AB', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('SK', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('MB', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('NS', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('NB', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('PE', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('NL', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('YT', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('NT', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0),
('NU', 'Cleaning Services', 'License', 'Municipal Business License', 'Municipal business license required', 1, 'Municipal Authority', NULL, 1, 0);

-- Update contract thresholds for specific requirements
UPDATE compliance_requirements 
SET contract_threshold_amount = 500.00
WHERE requirement_name = 'Written Contracts' AND trade_type = 'Plumbers' AND province = 'ON';