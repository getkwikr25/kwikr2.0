-- Insert sample workers with correct distribution
-- Ontario (350 workers represented by 5 samples)
INSERT INTO users (email, password_hash, password_salt, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('john.smith@email.com', 'hash1', 'salt1', 'worker', 'John', 'Smith', '416-555-0101', 'ON', 'Toronto', 1, 1, 1),
('sarah.johnson@email.com', 'hash2', 'salt2', 'worker', 'Sarah', 'Johnson', '613-555-0102', 'ON', 'Ottawa', 1, 1, 1),
('mike.wilson@email.com', 'hash3', 'salt3', 'worker', 'Mike', 'Wilson', '905-555-0103', 'ON', 'Hamilton', 1, 1, 1),
('lisa.davis@email.com', 'hash4', 'salt4', 'worker', 'Lisa', 'Davis', '519-555-0104', 'ON', 'London', 1, 1, 1),
('david.miller@email.com', 'hash5', 'salt5', 'worker', 'David', 'Miller', '705-555-0105', 'ON', 'Sudbury', 1, 1, 1);

-- Quebec (179 workers represented by 4 samples)
INSERT INTO users (email, password_hash, password_salt, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('pierre.martin@email.com', 'hash6', 'salt6', 'worker', 'Pierre', 'Martin', '514-555-0201', 'QC', 'Montreal', 1, 1, 1),
('marie.tremblay@email.com', 'hash7', 'salt7', 'worker', 'Marie', 'Tremblay', '418-555-0202', 'QC', 'Quebec City', 1, 1, 1),
('luc.gagnon@email.com', 'hash8', 'salt8', 'worker', 'Luc', 'Gagnon', '819-555-0203', 'QC', 'Gatineau', 1, 1, 1),
('julie.roy@email.com', 'hash9', 'salt9', 'worker', 'Julie', 'Roy', '450-555-0204', 'QC', 'Laval', 1, 1, 1);

-- British Columbia (166 workers represented by 4 samples)
INSERT INTO users (email, password_hash, password_salt, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('james.thompson@email.com', 'hash10', 'salt10', 'worker', 'James', 'Thompson', '604-555-0301', 'BC', 'Vancouver', 1, 1, 1),
('amy.clark@email.com', 'hash11', 'salt11', 'worker', 'Amy', 'Clark', '250-555-0302', 'BC', 'Victoria', 1, 1, 1),
('robert.lee@email.com', 'hash12', 'salt12', 'worker', 'Robert', 'Lee', '778-555-0303', 'BC', 'Surrey', 1, 1, 1),
('jennifer.white@email.com', 'hash13', 'salt13', 'worker', 'Jennifer', 'White', '236-555-0304', 'BC', 'Burnaby', 1, 1, 1);

-- Alberta (160 workers represented by 3 samples)
INSERT INTO users (email, password_hash, password_salt, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('kevin.brown@email.com', 'hash14', 'salt14', 'worker', 'Kevin', 'Brown', '403-555-0401', 'AB', 'Calgary', 1, 1, 1),
('michelle.taylor@email.com', 'hash15', 'salt15', 'worker', 'Michelle', 'Taylor', '780-555-0402', 'AB', 'Edmonton', 1, 1, 1),
('chris.anderson@email.com', 'hash16', 'salt16', 'worker', 'Chris', 'Anderson', '587-555-0403', 'AB', 'Red Deer', 1, 1, 1);

-- Manitoba (28 workers represented by 2 samples)
INSERT INTO users (email, password_hash, password_salt, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('steve.garcia@email.com', 'hash17', 'salt17', 'worker', 'Steve', 'Garcia', '204-555-0501', 'MB', 'Winnipeg', 1, 1, 1),
('nancy.martinez@email.com', 'hash18', 'salt18', 'worker', 'Nancy', 'Martinez', '431-555-0502', 'MB', 'Brandon', 1, 1, 1);

-- Saskatchewan (20 workers represented by 2 samples)
INSERT INTO users (email, password_hash, password_salt, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('ryan.rodriguez@email.com', 'hash19', 'salt19', 'worker', 'Ryan', 'Rodriguez', '306-555-0601', 'SK', 'Saskatoon', 1, 1, 1),
('laura.hernandez@email.com', 'hash20', 'salt20', 'worker', 'Laura', 'Hernandez', '639-555-0602', 'SK', 'Regina', 1, 1, 1);

-- Nova Scotia (15 workers represented by 1 sample)
INSERT INTO users (email, password_hash, password_salt, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('adam.lopez@email.com', 'hash21', 'salt21', 'worker', 'Adam', 'Lopez', '902-555-0701', 'NS', 'Halifax', 1, 1, 1);

-- New Brunswick (10 workers represented by 1 sample)
INSERT INTO users (email, password_hash, password_salt, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active) VALUES
('jessica.gonzalez@email.com', 'hash22', 'salt22', 'worker', 'Jessica', 'Gonzalez', '506-555-0801', 'NB', 'Moncton', 1, 1, 1);