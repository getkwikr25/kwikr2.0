-- Add business fields to user_profiles table

-- Add company/business information columns
ALTER TABLE user_profiles ADD COLUMN company_name TEXT;
ALTER TABLE user_profiles ADD COLUMN business_email TEXT;
ALTER TABLE user_profiles ADD COLUMN business_phone TEXT;
ALTER TABLE user_profiles ADD COLUMN business_address TEXT;
ALTER TABLE user_profiles ADD COLUMN business_license_number TEXT;
ALTER TABLE user_profiles ADD COLUMN business_registration_number TEXT;
ALTER TABLE user_profiles ADD COLUMN website_url TEXT;

-- Add business verification fields
ALTER TABLE user_profiles ADD COLUMN business_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN verification_documents_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));
ALTER TABLE user_profiles ADD COLUMN verification_notes TEXT;
ALTER TABLE user_profiles ADD COLUMN verified_at DATETIME;
ALTER TABLE user_profiles ADD COLUMN verified_by INTEGER;

-- Add indexes for business fields
CREATE INDEX IF NOT EXISTS idx_user_profiles_business_email ON user_profiles(business_email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_business_phone ON user_profiles(business_phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_business_license ON user_profiles(business_license_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_verification_status ON user_profiles(verification_status);

-- Add foreign key constraint for verifier
-- Note: SQLite doesn't support adding foreign keys to existing tables easily, so we'll handle this in application logic