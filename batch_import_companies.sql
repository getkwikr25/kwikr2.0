-- Import batch of real Kwikr companies
-- Delete range to avoid conflicts
DELETE FROM worker_services WHERE user_id BETWEEN 2000 AND 2200;
DELETE FROM user_profiles WHERE user_id BETWEEN 2000 AND 2200;
DELETE FROM users WHERE id BETWEEN 2000 AND 2200;

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2000, 'sales@drainmastertrenchless.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Drain', 'Master Plumbers', '1604-739-2000', 'BC', 'Burnaby', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2001, 'Dylan@epicplumbingandheating.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Epic', 'Plumbing and Heating', '1250-228-0876', 'BC', 'Parksville', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2002, 'sales@randbplumbing.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'R', '& B Plumbing & Heating Ltd.', '1604-980-1369', 'BC', 'North Vancouver', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2003, 'sales.ezflowplumbing@gmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'E', 'Z Flow Plumbing', '1705-641-1773', 'ON', 'Bracebridge', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2004, 'directplumbing@rogers.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Direct', 'Plumbing & Renovations Ltd.', '1249-486-5929', 'ON', 'Markham', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2005, 'service@durhampioneerplumbing.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Pioneer', 'Plumbing and Heating Ltd.', '1905-240-2290', 'ON', 'Oshawa', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2006, 'helloplumber@hotmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Hello', 'Plumber Inc.', '1506-476-8520', 'NB', 'Fredericton', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2007, 'kpearce@kalwest.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Kal-West', 'Mechanical Systems Inc.', '1250-765-6610', 'BC', 'Kelowna', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2008, 'service@instantplumbing.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Instant', 'Plumbing & Heating Ltd', '1403-338-1172', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2009, 'careers@perfectionplumbing.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Perfection', 'Plumbing & Drain Cleaning Ltd.', '1306-652-9556', 'SK', 'Saskatoon', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2010, 'info@saskrooterman.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Rooter', 'Man Drain Cleaning', '1306-651-2564', 'SK', 'Saskatoon', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2011, 'info@mdplumbing.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Martin', 'Dejong Plumbing & Heating Ltd.', '1905-628-5266', 'ON', 'Lynden', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2012, 'info@plomberiedaniellalonde.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Plomberie', 'Daniel Lalonde Inc.', '1514-444-3076', 'QC', 'Sainte-Marthe-sur-le-Lac', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2013, 'info@tek-plumbing.com, '$2b$12$dummy_hash_for_demo', 'worker', 'TEK', 'Plumbing & Heating Inc.', '1780-402-2551', 'AB', 'Grande Prairie', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2014, 'info@plomberieericlalonde.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Atelier', 'Plomberie Eric Lalonde inc', '1450-437-4411', 'QC', 'Blainville', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2015, 'harpersplumbingyyc@gmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Harper''s', 'Plumbing', '1587-216-1755', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2016, 'magnumplumbing@shaw.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Magnum', 'Plumbing & Heating Ltd', '1343-307-9642', 'BC', 'Victoria', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2017, 'reception@capitalplumbing.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Capital', 'Plumbing & Heating', '1780-451-5666', 'AB', 'Edmonton', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2018, 'drainproottawainc@bellnet.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'DrainPro', '| Ottawa Plumbing Services', '1613-233-7586', 'ON', 'Nepean', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2019, 'info@miketheplumber.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Mike', 'The Plumber Inc', '1519-716-6453', 'ON', 'Cambridge', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2020, 'plomberieleducinc@videotron.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Plomberie', 'Leduc Inc', '1450-692-7882', 'QC', 'Chí¢teauguay', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2021, 'contact@redsealplumbing.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Red', 'Seal Plumbing', '1604-618-4988', 'BC', 'Vancouver', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2022, 'crawfordtheplumber@gmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Crawford', 'Plumbing', '1705-985-3440', 'ON', 'Wasaga Beach', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2023, 'info@baumanns.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Baumann''s', 'Ventilation & Plumbing Ltd', '1403-529-9744', 'AB', 'Medicine Hat', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2024, 'office@abmech.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'A&B', 'Mechanical Ltd.', '1204-783-3622', 'MB', 'Winnipeg', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2025, 'info@plumbernearmeinc.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Plumber', 'Near Me', '1416-800-1991', 'ON', 'Georgetown', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2026, 'info@mcph.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Mid-City', 'Plumbing & Heating Inc', '1306-634-5512', 'SK', 'Estevan', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2027, 'chinookplumbingltd@gmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Chinook', 'Plumbing Ltd.', '1403-243-8849', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2028, 'admin@archiehorn-son.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Archie', 'Horn & Son', '1905-318-5020', 'ON', 'Hamilton', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2030, 'newmarket@mtdrain.com, '$2b$12$dummy_hash_for_demo', 'worker', 'MT', 'Drains & Plumbing LTD', '1905-761-5551', 'ON', 'Richmond Hill', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2031, 'office@westbaymechanical.com, '$2b$12$dummy_hash_for_demo', 'worker', 'West', 'Bay Mechanical Ltd', '1250-478-8532', 'BC', 'Nanaimo', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2032, 'info@globalsewer.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Global', 'Sewer Technologies', '1905-738-6704', 'ON', 'Concord', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2033, 'plomberie@pcsh.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Plomberie', 'et Chauffage St Hyacinthe Inc', '1450-774-7991', 'QC', 'Saint-Hyacinthe', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2034, 'recevables@plomberie.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Plomberie', 'Charbonneau Inc', '1514-766-3531', 'QC', 'Montreal', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2035, 'trustitplumbing@gmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Trust', 'It Plumbing', '1604-442-2069', 'BC', 'Vancouver', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2036, 'bou2@telus.net, '$2b$12$dummy_hash_for_demo', 'worker', 'BW', 'Bouwman Plumbing Ltd', '1403-845-4545', 'AB', 'Rocky Mountain House', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2037, 'kelly@kitsplumbingandheating.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Kits', 'Plumbing and Heating', '1778-875-3525', 'BC', 'Vancouver', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2038, 'service@plomberiedelacapitale.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Plomberie', 'de la Capitale', '1418-780-5710', 'QC', 'L''Ancienne-Lorette', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2039, 'service@precision-plumbing.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Precision', 'Plumbing Calgary', '1403-241-5200', 'AB', 'Calgary', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2040, 'service@urbanph.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Urban', 'Plumbing & Heating Ltd.', '1604-729-7519', 'BC', 'Burnaby', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2041, 'drainexpertsplumbing@gmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Drain', 'Experts Plumbing', '1416-602-7886', 'ON', 'Brampton', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2042, 'info@appleplumbingandheating.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Apple', 'Plumbing & Heating', '1604-618-4786', 'BC', 'Richmond', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2043, 'admin@aeair.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'A', 'E Air Plumbing & Heating Inc.', '1403-928-1625', 'AB', 'Medicine Hat', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2044, 'fowlerplumbing@gmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Fowler', 'Plumbing', '1519-979-3747', 'ON', 'Windsor', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2045, 'heartlandgoc@gmail.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Heartland', 'Plumbing and Heating Ltd.', '1780-851-9090', 'AB', 'Sherwood Park', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2046, 'info@khairabros.ca, '$2b$12$dummy_hash_for_demo', 'worker', 'Khaira', 'Bros Plumbing and Heating Ltd', '1604-831-6300', 'BC', 'Surrey', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES (
    2047, 'estimation@plomberiesevigny.com, '$2b$12$dummy_hash_for_demo', 'worker', 'Plomberie', 'D Sí©vigny Inc', '1819-824-6005', 'QC', 'Val-d''Or', TRUE, TRUE, TRUE);

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2000, '<p>Drain Master Plumbers offers expert services in water line and sewer line repair and replacement in Burnaby, British Columbia. This local business has built a reputation for reliability and efficiency, ensuring that plumbing issues are addressed promptly and professionally. With a focus on quality workmanship, Drain Master Plumbers has become a trusted name in the community.</p> <p>Specializing in both residential and commercial plumbing needs, Drain Master Plumbers utilizes advanced techniqu', 'https://www.kwikr.ca/pictures/profile/pimage-1020.jpg', '3287 Ardingley Ave', 'Drain Master Plumbers', 'https://www.kwikr.ca/pictures/profile/pimage-1020.jpg', 'https://drainmastertrenchless.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2000, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Drain Master Plumbers');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2001, '<p>Epic Plumbing and Heating provides essential plumbing and heating services to the residents of Parksville, British Columbia. This local business has built a strong reputation for delivering reliable and efficient solutions tailored to meet the unique needs of every customer. With a focus on quality and customer satisfaction, Epic Plumbing and Heating has become a trusted name in the community.</p><p>Specializing in a range of services, Epic Plumbing and Heating addresses everything from routi', 'https://www.kwikr.ca/pictures/profile/pimage-1019.jpg', '1100 Dobler Rd', 'Epic Plumbing and Heating', 'https://www.kwikr.ca/pictures/profile/pimage-1019.jpg', 'https://www.epicplumbingandheating.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2001, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Epic Plumbing and Heating');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2002, '<p>R & B Plumbing & Heating Ltd. offers comprehensive plumbing, heating, ventilation, cooling, and gas fitting services in North Vancouver, British Columbia. This local business excels in both residential and commercial projects, including new construction, heating system retrofits, renovations, service, installation, and maintenance. With a commitment to quality, R & B Plumbing uses reputable products such as American Standard, Kohler, IBC, Carrier, and Viessman, ensuring reliable solutions for', 'https://www.kwikr.ca/pictures/profile/pimage-1018.jpg', '1075 W 1st St #104', 'R & B Plumbing & Heating Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-1018.jpg', 'https://randbplumbing.ca/?utm_source=googlemybusiness&utm_medium=Organic&utm_campaign=GoogleMyBusiness', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2002, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by R & B Plumbing & Heating Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2003, '<p>E Z Flow Plumbing provides reliable plumbing services in Bracebridge, Ontario. This local business specializes in residential and commercial plumbing solutions, including repairs, installations, and maintenance. With a commitment to quality and customer satisfaction, E Z Flow Plumbing has built a strong reputation in the community.</p><p>The team at E Z Flow Plumbing consists of experienced professionals equipped to handle various plumbing challenges. From leaky faucets to complex sewer line ', 'https://www.kwikr.ca/pictures/profile/pimage-1017.jpg', '45 Woodland Dr', 'E Z Flow Plumbing', 'https://www.kwikr.ca/pictures/profile/pimage-1017.jpg', 'http://ezflowplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2003, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by E Z Flow Plumbing');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2004, '<p>Direct Plumbing & Renovations Ltd. offers exceptional plumbing solutions and home renovation services in Markham, Ontario. Located at 300 Steelcase Rd W #30, this company provides a wide range of services, from minor plumbing repairs to comprehensive home renovations. With a team of skilled professionals, they prioritize quality workmanship and customer satisfaction.</p> <p>The expertise of Direct Plumbing & Renovations Ltd. is evident in every project they undertake. Their attention to detai', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '300 Steelcase Rd W #30', 'Direct Plumbing & Renovations Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://directplumbingandreno.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2004, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Direct Plumbing & Renovations Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2005, '<p>Pioneer Plumbing and Heating Ltd. offers reliable commercial and residential plumbing services in Oshawa, Ontario. This local business provides a range of solutions, including installation, maintenance, and repair of plumbing systems. With a commitment to quality and customer satisfaction, Pioneer Plumbing has built a solid reputation in the community.</p>  <p>Serving both homes and businesses, Pioneer Plumbing and Heating Ltd. understands the unique needs of each customer. The team of skille', 'https://www.kwikr.ca/pictures/profile/pimage-1015.jpg', '205 Waverly St S', 'Pioneer Plumbing and Heating Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-1015.jpg', 'https://durhampioneerplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2005, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Pioneer Plumbing and Heating Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2006, '<p>Hello Plumber Inc. operates in Fredericton, New Brunswick, offering professional plumbing services tailored for both residential and commercial needs. The company prioritizes quality and competitive pricing, ensuring customers receive reliable plumbing solutions. Extensive experience in the field enhances their reputation as a trusted service provider.</p> <p>The team at Hello Plumber Inc. is dedicated to addressing a wide range of plumbing issues, from routine maintenance to emergency repair', 'https://www.kwikr.ca/pictures/profile/pimage-1014.jpg', '691 Riverside Dr', 'Hello Plumber Inc.', 'https://www.kwikr.ca/pictures/profile/pimage-1014.jpg', 'http://www.helloplumber.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2006, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Hello Plumber Inc.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2007, '<p>Kal-West Mechanical Systems Inc. offers comprehensive plumbing, heating, and mechanical contracting services in Kelowna, British Columbia. Established in 1987, this company has built a reputation for excellence in Division 15 mechanical construction. With a portfolio that includes schools, hospitals, sewage and wastewater treatment plants, and large office buildings, Kal-West has become a trusted name for various organizations and institutions across the region.</p><p>Expertise defines Kal-We', 'https://www.kwikr.ca/pictures/profile/pimage-1013.jpg', '710 Evans Ct', 'Kal-West Mechanical Systems Inc.', 'https://www.kwikr.ca/pictures/profile/pimage-1013.jpg', 'http://www.kalwest.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2007, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Kal-West Mechanical Systems Inc.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2008, '<p>Instant Plumbing & Heating Ltd provides comprehensive residential plumbing services in Calgary, Alberta. This business specializes in toilet, drain, faucet, and shower repairs or replacements, ensuring homes remain functional and comfortable. Additionally, the company offers water treatment systems, heating and cooling solutions, and operates a 24/7 emergency service for urgent needs.</p><p>Established to meet the diverse plumbing requirements of Calgary residents, Instant Plumbing & Heating ', 'https://www.kwikr.ca/pictures/profile/pimage-1012.jpg', '3625 6 St NE', 'Instant Plumbing & Heating Ltd', 'https://www.kwikr.ca/pictures/profile/pimage-1012.jpg', 'https://www.instantplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2008, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Instant Plumbing & Heating Ltd');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2009, '<p>Perfection Plumbing & Drain Cleaning Ltd. provides reliable plumbing services in Saskatoon, Saskatchewan. This local business has been addressing plumbing and drain issues since 1996, ensuring customers receive transparent pricing and options before any work begins. Known for its commitment to true customer service, Perfection Plumbing offers a peace of mind warranty on all services.</p> <p>This plumbing company operates 24/7, catering to emergency situations throughout the year. Clients can ', 'https://www.kwikr.ca/pictures/profile/pimage-1011.jpg', '1100 7 Ave N #9', 'Perfection Plumbing & Drain Cleaning Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-1011.jpg', 'https://www.perfectionplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2009, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Perfection Plumbing & Drain Cleaning Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2010, '<p>Rooter Man Drain Cleaning provides essential plumbing services in Saskatoon, Saskatchewan. This local business specializes in drain cleaning, grease trap cleaning, portable washrooms, HVAC services, and more. With a commitment to customer satisfaction, Rooter Man ensures efficient and reliable solutions for various plumbing needs.</p><p>The team at Rooter Man Drain Cleaning operates with precision and expertise. They utilize advanced techniques and equipment to tackle stubborn clogs and maint', 'https://www.kwikr.ca/pictures/profile/pimage-1010.jpg', '502 Avenue M S', 'Rooter Man Drain Cleaning', 'https://www.kwikr.ca/pictures/profile/pimage-1010.jpg', 'http://www.saskrooterman.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2010, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Rooter Man Drain Cleaning');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2011, '<p>Martin Dejong Plumbing & Heating Ltd. offers expert plumbing services in Lynden, Ontario. Established in 1979, this local business specializes in both commercial and residential plumbing needs. The certified staff ensures professional results, making it a reliable choice for the community.</p>  <p>With decades of experience, Martin Dejong Plumbing & Heating Ltd. addresses various plumbing issues including installations, repairs, and maintenance. The company prides itself on delivering quality', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '199 Orkney Rd', 'Martin Dejong Plumbing & Heating Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://www.mdplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2011, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Martin Dejong Plumbing & Heating Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2012, '<p>Plomberie Daniel Lalonde Inc. provides essential plumbing services to residents of Sainte-Marthe-sur-le-Lac, Quebec. This local business specializes in a range of plumbing solutions, including installations, repairs, and maintenance. With a commitment to quality and customer satisfaction, Plomberie Daniel Lalonde Inc. has built a solid reputation in the community.</p><p>Years of experience in the plumbing industry equip the team with the skills necessary to handle various plumbing challenges.', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '3089 Rue de l''Orchidí©e', 'Plomberie Daniel Lalonde Inc.', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'https://www.plomberiedaniellalonde.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2012, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Plomberie Daniel Lalonde Inc.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2013, '<p>TEK Plumbing & Heating Inc. delivers comprehensive plumbing services in Grande Prairie, Alberta. This locally owned and operated company excels in both residential and commercial plumbing projects, ensuring quality workmanship and customer satisfaction. With a focus on various plumbing needs, TEK Plumbing stands ready to tackle any challenge, from minor repairs to extensive installations.</p><p>The array of services offered includes water heater installation and repair, sewer drain line clean', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', '11434 89 Ave', 'TEK Plumbing & Heating Inc.', 'https://www.kwikr.ca/pictures/profile/pimage-1007.jpg', 'http://www.tek-plumbing.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2013, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by TEK Plumbing & Heating Inc.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2014, '<p>Atelier Plomberie Eric Lalonde inc offers reliable plumbing services in Blainville, Quebec. This local business specializes in residential and commercial plumbing solutions, ensuring quality workmanship and customer satisfaction. With years of experience in the industry, the team addresses various plumbing needs, from routine maintenance to emergency repairs.</p> <p>The skilled professionals at Atelier Plomberie Eric Lalonde inc understand the importance of efficient plumbing systems. They pr', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '20 Rue íŠmilien Marcoux suite 103', 'Atelier Plomberie Eric Lalonde inc', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://www.plomberieericlalonde.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2014, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Atelier Plomberie Eric Lalonde inc');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2015, '<p>Harper''s Plumbing operates in Calgary, Alberta, providing reliable plumbing services for both residential and commercial needs. This family-owned business prides itself on its commitment to the community, offering a range of services including plumbing repairs, hot water and boiler installations, gas fittings, and drain cleaning. With a dedicated team of four, Harper''s Plumbing ensures that every job is completed efficiently and effectively.</p><p>With over a decade of experience, Harper''s Pl', 'https://www.kwikr.ca/pictures/profile/pimage-1005.jpg', '280 Cedarille Green SW', 'Harper''s Plumbing', 'https://www.kwikr.ca/pictures/profile/pimage-1005.jpg', 'https://www.harpersplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2015, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Harper's Plumbing');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2016, '<p>Magnum Plumbing & Heating Ltd provides comprehensive plumbing and heating services in Victoria, British Columbia. Located on Balmoral Road, this business is known for its skilled professionals and reliable solutions. The team specializes in a wide range of plumbing services, ensuring that both homeowners and businesses receive top-notch care.</p> <p>This local company focuses on delivering high-quality craftsmanship, addressing everything from minor repairs to complex installations. The licen', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '1289 Balmoral Rd', 'Magnum Plumbing & Heating Ltd', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://www.magnumplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2016, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Magnum Plumbing & Heating Ltd');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2017, '<p>Capital Plumbing & Heating provides comprehensive plumbing and heating services in Edmonton, Alberta. With over 20 years of experience, this local business excels in emergency plumbing, heating, cooling, and HVAC services. The team prioritizes transparency and reliability, ensuring customer satisfaction from the initial contact to the final walkthrough.</p> <p>Capital Plumbing & Heating specializes in addressing urgent plumbing needs, making it a trusted choice for residents in Edmonton. The ', 'https://www.kwikr.ca/pictures/profile/pimage-1003.jpg', '14843 118 Ave NW', 'Capital Plumbing & Heating', 'https://www.kwikr.ca/pictures/profile/pimage-1003.jpg', 'https://capitalplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2017, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Capital Plumbing & Heating');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2018, '<p>DRAINPRO offers comprehensive plumbing services in Nepean, Ontario, catering to both residential and commercial needs. This local business operates throughout the Greater Ottawa Area, ensuring prompt and reliable service. Equipped with a fleet of fully loaded trucks, DRAINPRO is prepared to tackle various plumbing challenges efficiently.</p> <p>Specializing in a wide range of plumbing solutions, DRAINPRO provides expertise in installations, repairs, and maintenance. The team of skilled profes', 'https://www.kwikr.ca/pictures/profile/pimage-1002.jpg', '1980 Merivale Rd', 'DrainPro | Ottawa Plumbing Services', 'https://www.kwikr.ca/pictures/profile/pimage-1002.jpg', 'https://ottawaplumbingservice.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2018, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by DrainPro | Ottawa Plumbing Services');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2019, '<p>Mike The Plumber Inc offers comprehensive plumbing services to the Cambridge, Ontario area, including Kitchener-Waterloo, Guelph, Woodstock, and Brantford. This company excels in handling a variety of plumbing issues, from clogged drains to leaking pipes. With a reputation for reliability, Mike The Plumber delivers prompt solutions to plumbing emergencies.</p><p>Services include sewer pipe snaking, hydro-flushing, and camera inspections to accurately locate drain pipes. Gas piping hook-ups an', 'https://www.kwikr.ca/pictures/profile/pimage-1001.jpg', '133 Chestnut St N', 'Mike The Plumber Inc', 'https://www.kwikr.ca/pictures/profile/pimage-1001.jpg', 'http://www.miketheplumber.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2019, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Mike The Plumber Inc');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2020, '<p>Plomberie Leduc Inc provides essential plumbing services in Chí¢teauguay, Quebec. This local business specializes in residential and commercial plumbing solutions, ensuring efficient and reliable service. With a commitment to quality and customer satisfaction, Plomberie Leduc Inc has built a strong reputation in the community.</p><p>Offering a range of services, Plomberie Leduc Inc handles everything from routine maintenance to emergency repairs. The team of experienced plumbers is equipped t', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '155 Rue Principale', 'Plomberie Leduc Inc', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://plomberieleduc.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2020, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Plomberie Leduc Inc');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2021, '<p>Red Seal Plumbing, based in Vancouver, British Columbia, specializes in comprehensive plumbing services for both residential and commercial clients. This local business excels in addressing a wide range of plumbing and drainage issues, ensuring efficient and professional service. With a commitment to quality, Red Seal Plumbing serves areas including North Vancouver, East Vancouver, West Vancouver, Downtown Vancouver, West End, and Burnaby.</p><p>The team at Red Seal Plumbing consists of exper', 'https://www.kwikr.ca/pictures/profile/pimage-999.jpg', '2790 E 21st Ave', 'Red Seal Plumbing', 'https://www.kwikr.ca/pictures/profile/pimage-999.jpg', 'https://www.redsealplumbing.com/service-areas/vancouver-bc/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2021, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Red Seal Plumbing');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2022, '<p>Crawford Plumbing offers expert plumbing services in Wasaga Beach, Ontario. This customer-focused business provides a range of solutions, ensuring satisfaction and reliability. With a commitment to quality and professionalism, Crawford Plumbing addresses various plumbing needs for both residential and commercial clients.</p><p>Located at 14 Dennis Dr, Crawford Plumbing has built a reputation for delivering timely and efficient plumbing solutions. The skilled team specializes in installations,', 'https://www.kwikr.ca/pictures/profile/pimage-998.jpg', '14 Dennis Dr', 'Crawford Plumbing', 'https://www.kwikr.ca/pictures/profile/pimage-998.jpg', 'https://crawfordtheplumber.wixsite.com/crawford-plumbing', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2022, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Crawford Plumbing');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2023, '<p>Baumann''s Ventilation & Plumbing Ltd, located in Medicine Hat, Alberta, offers a range of essential services in residential and commercial heating, air-conditioning, and plumbing. This business has built a reputation for reliability and quality, serving the community with dedication and expertise. With a focus on customer satisfaction, Baumann''s provides comprehensive solutions tailored to meet diverse needs.</p><p>The company specializes in plumbing services that cover everything from routin', 'https://www.kwikr.ca/pictures/profile/pimage-997.jpg', '79 SW Dr S W', 'Baumann''s Ventilation & Plumbing Ltd', 'https://www.kwikr.ca/pictures/profile/pimage-997.jpg', 'http://www.baumanns.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2023, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Baumann's Ventilation & Plumbing Ltd');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2024, '<p>A&B Mechanical Ltd. offers comprehensive plumbing, heating, air conditioning, and indoor air quality services in Winnipeg, Manitoba. This local business excels in providing essential services to ensure a comfortable living environment for residents and businesses alike. A&B Mechanical Ltd. employs highly trained staff and qualified service technicians dedicated to maintaining optimal comfort while promoting cost savings for customers.</p> <p>The company specializes in a range of plumbing serv', 'https://www.kwikr.ca/pictures/profile/pimage-996.jpg', '1400 Spruce St', 'A&B Mechanical Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-996.jpg', 'https://www.abmech.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2024, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by A&B Mechanical Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2025, '<p>Plumber Near Me offers expert plumbing services specializing in drain and waterproofing solutions in Georgetown, Ontario. This local business serves the Greater Toronto Area and Halton Hills, ensuring reliable and efficient plumbing for residential and commercial clients. With a commitment to quality, Plumber Near Me has built a reputation for excellence in the plumbing industry.</p> <p>Offering a comprehensive range of services, Plumber Near Me addresses various plumbing needs, including dra', 'https://www.kwikr.ca/pictures/profile/pimage-995.jpg', '9660 Wellington Rd 42', 'Plumber Near Me', 'https://www.kwikr.ca/pictures/profile/pimage-995.jpg', 'http://plumbernearmeinc.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2025, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Plumber Near Me');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2026, '<p>Mid-City Plumbing & Heating Inc delivers reliable plumbing, heating, and HVAC services to Estevan, Saskatchewan. Established in 1966, the company has built a reputation for excellence in installation, repair, and service. With a team of certified Journeymen Technicians, Mid-City Plumbing & Heating Inc ensures prompt assistance around the clock, catering to the needs of residential and commercial clients alike.</p><p>Offering comprehensive plumbing solutions, Mid-City Plumbing & Heating Inc sp', 'https://www.kwikr.ca/pictures/profile/pimage-994.jpg', '1237 6 St', 'Mid-City Plumbing & Heating Inc', 'https://www.kwikr.ca/pictures/profile/pimage-994.jpg', 'http://mcph.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2026, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Mid-City Plumbing & Heating Inc');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2027, '<p>Chinook Plumbing Ltd. offers reliable plumbing services in Calgary, Alberta. This local business specializes in residential and commercial plumbing solutions, ensuring quality work and customer satisfaction. With years of experience, Chinook Plumbing Ltd. has built a reputation for its skilled technicians and prompt service.</p><p>Located at 6773 Fairmount Dr SE, Chinook Plumbing Ltd. provides a wide range of plumbing services. These include emergency repairs, routine maintenance, and install', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '6773 Fairmount Dr SE', 'Chinook Plumbing Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://www.chinookplumbing.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2027, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Chinook Plumbing Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2028, '<p>Archie Horn & Son Ltd. offers comprehensive plumbing, heating, air conditioning, and renovation services in Hamilton, Ontario. With over 88 years of experience, this local business has built a reputation for reliability and convenience. The company is licensed, bonded, and insured, ensuring peace of mind for customers. Technicians are dedicated to delivering trouble-free service and worry-free installation.</p><p>Specializing in energy-efficient equipment, Archie Horn & Son Ltd. meets the div', 'https://www.kwikr.ca/pictures/profile/pimage-992.jpg', '31 Bigwin Rd #1', 'Archie Horn & Son', 'https://www.kwikr.ca/pictures/profile/pimage-992.jpg', 'https://www.archiehorn-son.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2028, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Archie Horn & Son');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2030, '<p>MT Drains & Plumbing LTD delivers exceptional plumbing, waterproofing, and drain services to the Richmond Hill area in Ontario. With over 30 years of industry experience, this company has established a reputation for reliability and efficiency. Certified technicians tackle various plumbing challenges, ensuring homes remain safe and comfortable.</p>  <p>Services include internal and external basement waterproofing, foundation repairs, and sump pump installations. Each service comes with a life', 'https://www.kwikr.ca/pictures/profile/pimage-990.jpg', '604 Edward Ave Unit #5', 'MT Drains & Plumbing LTD', 'https://www.kwikr.ca/pictures/profile/pimage-990.jpg', 'https://mtdrain.com/?utm_source=gmb_concord&utm_medium=referral', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2030, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by MT Drains & Plumbing LTD');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2031, '<p>West Bay Mechanical Ltd provides comprehensive plumbing services in Nanaimo, British Columbia. The company specializes in residential and commercial plumbing solutions, ensuring efficient and reliable service. With a commitment to quality, West Bay Mechanical Ltd offers expertise in installations, repairs, and maintenance, catering to the diverse needs of the community.</p><p>Established in the heart of Nanaimo, West Bay Mechanical Ltd has built a solid reputation for its professionalism and ', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '1631 Harold Rd', 'West Bay Mechanical Ltd', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://www.westbaymechanical.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2031, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by West Bay Mechanical Ltd');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2032, '<p>Global Sewer Technologies, located at 69 Maplecrete Rd in Concord, Ontario, provides expert plumbing services to the local community. With a focus on efficient solutions, this business specializes in sewer line repairs, drain cleaning, and emergency plumbing services. Their commitment to quality and customer satisfaction has earned them a solid reputation in the area.</p><p>This local plumber utilizes advanced technology and skilled technicians to address a variety of plumbing issues. From re', 'https://www.kwikr.ca/pictures/profile/pimage-988.jpg', '69 Maplecrete Rd', 'Global Sewer Technologies', 'https://www.kwikr.ca/pictures/profile/pimage-988.jpg', 'http://globalsewer.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2032, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Global Sewer Technologies');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2033, '<p>Plomberie et Chauffage St-Hyacinthe Inc offers comprehensive plumbing and heating services in Saint-Hyacinthe, Quebec. Established in 1954, this family-owned business has built a strong reputation for its expertise in installation, sales, and repairs. Serving the Rive-Sud area, the company addresses a wide range of plumbing and heating needs for both residential and commercial clients.</p><p>The team at Plomberie et Chauffage St-Hyacinthe focuses on delivering reliable solutions tailored to e', 'https://www.kwikr.ca/pictures/profile/pimage-987.jpg', '585 Av. Brodeur', 'Plomberie et Chauffage St Hyacinthe Inc', 'https://www.kwikr.ca/pictures/profile/pimage-987.jpg', 'https://www.plomberieetchauffagesthyacinthe.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2033, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Plomberie et Chauffage St Hyacinthe Inc');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2034, '<p>Plomberie Charbonneau Inc, located at 1955 Rue Cabot in Montreal, Quebec, excels in providing personalized plumbing, heating, and air conditioning services. This local business operates 24 hours a day, ensuring reliable and tailored expertise for various plumbing needs. With a team of over 500 experienced plumbers, each trained in specialized techniques, the company guarantees quality and professionalism in every project.</p><p>The services offered by Plomberie Charbonneau include installatio', 'https://www.kwikr.ca/pictures/profile/pimage-986.jpg', '1955 Rue Cabot', 'Plomberie Charbonneau Inc', 'https://www.kwikr.ca/pictures/profile/pimage-986.jpg', 'https://plomberie.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2034, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Plomberie Charbonneau Inc');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2035, '<p>Trust It Plumbing operates in Vancouver, British Columbia, providing a range of plumbing services tailored to meet the needs of the local community. This professional and experienced plumbing company specializes in trenchless water mains, camera inspections, perimeter drainage, sewer mains, hot water tanks, and sump pumps, among other services. Trust It Plumbing is dedicated to delivering fast, friendly, and reliable service, ensuring that plumbing issues are resolved efficiently.</p> <p>The ', 'https://www.kwikr.ca/pictures/profile/pimage-985.jpg', '230-997 Seymour St', 'Trust It Plumbing', 'https://www.kwikr.ca/pictures/profile/pimage-985.jpg', 'https://www.trustitplumbing.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2035, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Trust It Plumbing');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2036, '<p>BW Bouwman Plumbing Ltd provides expert plumbing services in Rocky Mountain House, Alberta. This local business specializes in residential and commercial plumbing solutions, ensuring high-quality workmanship and customer satisfaction. With a focus on reliable service, BW Bouwman Plumbing Ltd has established a reputation for prompt and efficient plumbing repairs, installations, and maintenance.</p> <p>The team at BW Bouwman Plumbing Ltd brings years of experience to every job. They handle a va', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '4436 47 Ave', 'BW Bouwman Plumbing Ltd', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://www.bouwmanplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2036, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by BW Bouwman Plumbing Ltd');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2037, '<p>Kits Plumbing and Heating, located at 2288 W Broadway #324 in Vancouver, British Columbia, specializes in comprehensive plumbing and heating services. With over 13 years of experience, this business excels in new construction and renovations, plumbing repairs, and the maintenance, repair, and installation of hot water tanks, furnaces, HVAC systems, drainage, air conditioning, heat pumps, and boilers. Kits Plumbing and Heating holds the TSBC Licence # LGA0201478, ensuring reliable and professi', 'https://www.kwikr.ca/pictures/profile/pimage-983.jpg', '2288 W Broadway #324', 'Kits Plumbing and Heating', 'https://www.kwikr.ca/pictures/profile/pimage-983.jpg', 'https://kitsplumbingandheating.com/?utm_campaign=gmb', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2037, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Kits Plumbing and Heating');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2038, '<p>Plomberie de la Capitale provides exceptional plumbing services in L''Ancienne-Lorette, Quebec, with over 35 years of industry experience. This local business specializes in heavy residential plumbing, ensuring that no plumbing issue is too large to handle. The team has established a strong reputation for quality service and superior expertise, making it a trusted choice for residents.</p> <p>This company focuses on delivering timely and effective solutions for various plumbing needs. Whether ', 'https://www.kwikr.ca/pictures/profile/pimage-982.jpg', '6345 Bd Wilfrid-Hamel local 102', 'Plomberie de la Capitale', 'https://www.kwikr.ca/pictures/profile/pimage-982.jpg', 'http://plomberiedelacapitale.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2038, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Plomberie de la Capitale');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2039, '<p>Precision Plumbing Calgary provides exceptional plumbing, gas fitting, and drain cleaning services to both commercial and residential customers in Calgary, Alberta. Established in 2009, this local business has built a reputation for delivering reliable and professional service. With a commitment to quality, Precision Plumbing collaborates with leading suppliers to ensure the highest standards in plumbing supplies and services.</p> <p>The team at Precision Plumbing consists of skilled plumbers', 'https://www.kwikr.ca/pictures/profile/pimage-981.jpg', '1011 57 Ave NE', 'Precision Plumbing Calgary', 'https://www.kwikr.ca/pictures/profile/pimage-981.jpg', 'https://precision-plumbing.ca/?utm_source=gmb&utm_medium=calgary', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2039, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Precision Plumbing Calgary');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2040, '<p>Urban Plumbing & Heating Ltd. provides reliable plumbing services to the residents of Burnaby, British Columbia. This local business specializes in a variety of plumbing solutions, including installation, maintenance, and emergency repairs. With a commitment to customer satisfaction, Urban Plumbing & Heating Ltd. has built a reputation for quality and efficiency in the community.</p><p>The skilled team at Urban Plumbing & Heating Ltd. possesses extensive knowledge and experience in the plumbi', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '108-3191 Thunderbird Crescent', 'Urban Plumbing & Heating Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'https://urbanph.com/contact/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2040, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Urban Plumbing & Heating Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2041, '<p>Drain Experts Plumbing provides reliable plumbing services in Brampton, Ontario. This local business excels in various plumbing solutions, including drain cleaning, plumbing installation, camera inspections, waterproofing, leak detection, and sump pump replacement. Open 24/7, Drain Experts Plumbing ensures that residents receive prompt assistance whenever needed. The company prides itself on its knowledgeable staff and fair pricing.</p><p>With a commitment to quality, Drain Experts Plumbing o', 'https://www.kwikr.ca/pictures/profile/pimage-979.jpg', '215 Queen St E', 'Drain Experts Plumbing', 'https://www.kwikr.ca/pictures/profile/pimage-979.jpg', 'https://www.drainexpertsplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2041, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Drain Experts Plumbing');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2042, '<p>Apple Plumbing & Heating provides essential plumbing, heating, and cooling services to the Richmond area in British Columbia. This local business excels in offering reliable solutions for residential and commercial needs. With a strong commitment to customer satisfaction, Apple Plumbing & Heating has established a reputation for quality workmanship and prompt service.</p> <p>The team at Apple Plumbing & Heating consists of skilled professionals who understand the intricacies of plumbing syste', 'https://www.kwikr.ca/pictures/profile/pimage-978.jpg', '9151 Chapmond Crescent', 'Apple Plumbing & Heating', 'https://www.kwikr.ca/pictures/profile/pimage-978.jpg', 'http://www.appleplumbingandheating.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2042, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Apple Plumbing & Heating');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2043, '<p>A E Air Plumbing & Heating Inc. provides essential HVAC and plumbing services to the Medicine Hat community in Alberta. This local business operates 24 hours a day for emergency calls, ensuring that residents have access to reliable plumbing solutions at any time. The office remains open Monday through Friday from 8 am to 4 pm, offering a range of services tailored to meet the needs of the local population.</p><p>With a commitment to quality and customer satisfaction, A E Air Plumbing & Heati', 'https://www.kwikr.ca/pictures/profile/pimage-977.jpg', '734 15 St SW', 'A E Air Plumbing & Heating Inc.', 'https://www.kwikr.ca/pictures/profile/pimage-977.jpg', 'https://aeair.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2043, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by A E Air Plumbing & Heating Inc.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2044, '<p>Fowler Plumbing, located at 3215 Jefferson Blvd Unit 301 in Windsor, Ontario, delivers exceptional plumbing services to the local community. This business specializes in plumbing repair and installation, ensuring that every customer receives top-notch service. With years of experience, the team at Fowler Plumbing possesses the knowledge necessary to tackle a variety of plumbing issues, from leaky faucets to new toilet installations.</p><p>The commitment to detail sets Fowler Plumbing apart fr', 'https://www.kwikr.ca/pictures/profile/pimage-976.jpg', '3215 Jefferson Blvd Unit 301', 'Fowler Plumbing', 'https://www.kwikr.ca/pictures/profile/pimage-976.jpg', 'https://fowlerplumbing.ca/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2044, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Fowler Plumbing');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2045, '<p>Heartland Plumbing and Heating Ltd. provides expert plumbing services, heating solutions, and emergency repairs in Sherwood Park, Alberta. This premier company specializes in a wide range of services including furnaces, boilers, gasfitting, and air conditioning. With a team of certified professionals, Heartland Plumbing ensures high-quality service for residential and commercial clients.</p> <p>The company employs Journeyman Plumbers, Gasfitters, Electricians, and Refrigeration/Air Conditioni', 'https://www.kwikr.ca/pictures/profile/pimage-975.jpg', '12 Hillview Crescent', 'Heartland Plumbing and Heating Ltd.', 'https://www.kwikr.ca/pictures/profile/pimage-975.jpg', 'https://heartlandplumbingandheating.ca/sherwood-park/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2045, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Heartland Plumbing and Heating Ltd.');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2046, '<p>Khaira Bros Plumbing and Heating Ltd provides essential plumbing and heating services to Surrey, British Columbia, and surrounding areas such as Langley, Delta, Burnaby, South Surrey, White Rock, Richmond, Vancouver, and Coquitlam. This local business specializes in a wide range of services including repairs, installations, and maintenance, ensuring homes and businesses remain comfortable and functional.</p><p>With a commitment to quality and customer satisfaction, Khaira Bros Plumbing and He', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', '8958 149 St', 'Khaira Bros Plumbing and Heating Ltd', 'https://www.kwikr.ca/pictures/profile/pimage-default.jpg', 'http://www.khairabros.ca/about-us-2/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2046, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Khaira Bros Plumbing and Heating Ltd');

INSERT INTO user_profiles (user_id, bio, profile_image_url, address_line1, company_name, company_logo_url, website_url, years_in_business) VALUES (
    2047, '<p>Plomberie D Sí©vigny Inc provides reliable plumbing services in Val-d''Or, Quebec. This business operates in residential, commercial, and industrial sectors, establishing a strong reputation in the Vallí©e-de-l''Or region. Their expertise covers a wide range of plumbing needs, ensuring quality solutions for various clients.</p> <p>The company specializes in both routine maintenance and emergency plumbing services. Their team of skilled plumbers addresses issues like leaks, clogs, and installati', 'https://www.kwikr.ca/pictures/profile/pimage-973.jpg', '1124 Chem. Sullivan', 'Plomberie D Sí©vigny Inc', 'https://www.kwikr.ca/pictures/profile/pimage-973.jpg', 'https://plomberiesevigny.com/', 10);

INSERT INTO worker_services (user_id, service_name, service_category, hourly_rate, is_available, description) VALUES (
    2047, 'Professional Services', 'General', 85.00, TRUE, 'Professional services provided by Plomberie D Sí©vigny Inc');
