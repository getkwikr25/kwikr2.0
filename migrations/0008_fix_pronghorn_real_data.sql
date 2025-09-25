-- Fix Pronghorn Controls Ltd with real data from actual Kwikr database
-- Correct location: Grande Prairie (not Calgary)
-- Correct address: 9544 115 St, Grande Prairie
-- Correct description: Real 40+ years experience, incorporated 1981

-- Update user location to correct city
UPDATE users 
SET city = 'Grande Prairie'
WHERE id = 5;

-- Update user_profiles with correct real data from Kwikr database
UPDATE user_profiles 
SET 
  bio = 'Pronghorn Controls Ltd, located at 9544 115 St in Grande Prairie, Alberta, offers premier electrical installation services with over 40 years of industry experience. Since its incorporation in 1981, this company has built a reputation for delivering high-quality instrumentation and electrical solutions to various sectors, including industrial, agricultural, mining, oil and gas, pipeline, and petrochemical industries across Western Canada.',
  address_line1 = '9544 115 St',
  address_line2 = '',
  postal_code = 'T8V 6N1',
  company_description = 'Pronghorn Controls Ltd combines expertise with a forward-looking growth strategy, ensuring consistent delivery of exceptional services. The company''s dedication to quality and safety makes it a reliable partner for clients in various industries. With a proven track record and a commitment to excellence, Pronghorn Controls Ltd continues to thrive in Alberta''s electrical installation landscape. The organization emphasizes safety, integrity, performance, learning, and teamwork as its core values.',
  years_in_business = 44
WHERE user_id = 5;