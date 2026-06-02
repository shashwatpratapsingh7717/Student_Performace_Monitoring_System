
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(20) -- 'student' ya 'faculty'
);


CREATE TABLE student_profiles (
    user_id INT REFERENCES users(id),
    enrollment_no VARCHAR(50) UNIQUE,
    current_semester INT,
    attendance_percentage DECIMAL(5,2),
    PRIMARY KEY (user_id)
);


CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES student_profiles(user_id),
    subject_name VARCHAR(100),
    status VARCHAR(20), -- 'Submitted', 'Pending', 'Graded'
    marks_obtained INT
);

SELECT * FROM users

ALTER TABLE student_profiles ADD COLUMN mst1_marks INT DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN mst2_marks INT DEFAULT 0;

SELECT * FROM student_profiles
DELETE FROM assignments WHERE subject_name = 'General';


ALTER TABLE assignments ADD COLUMN file_path TEXT;

SELECT id, student_id, subject_name, status, file_path FROM assignments ORDER BY id DESC;

SELECT * FROM assignments WHERE student_id = 5;
select * from assignments

SELECT * FROM users;
SELECT * FROM student_profiles;
SELECT * FROM assignments;

SELECT 
    u.name AS student_name, 
    sp.enrollment_no, 
    sp.current_semester, 
    a.subject_name, 
    a.status, 
    a.file_path
FROM users u
JOIN student_profiles sp ON u.id = sp.user_id
JOIN assignments a ON u.id = a.student_id;


CREATE VIEW student_full_report AS
SELECT 
    u.name AS student_name, 
    sp.enrollment_no, 
    sp.current_semester, 
    a.subject_name, 
    a.status, 
    a.file_path
FROM users u
JOIN student_profiles sp ON u.id = sp.user_id
JOIN assignments a ON u.id = a.student_id;

SELECT * FROM student_full_report;


ALTER TABLE assignments ADD COLUMN assignment_title TEXT DEFAULT 'Assignment 1';


ALTER TABLE student_profiles ADD COLUMN parents_email TEXT;

CREATE TABLE mentors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    current_otp VARCHAR(10)
);



Select * from mentors

-- student_profiles table me mentor_id add karna
ALTER TABLE student_profiles ADD COLUMN mentor_id INT REFERENCES mentors(id);