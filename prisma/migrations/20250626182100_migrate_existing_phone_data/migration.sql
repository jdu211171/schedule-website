-- Migrate existing phone data to contact_phones table

-- Migrate home phones
INSERT INTO contact_phones (id, student_id, phone_type, phone_number, "order", notes)
SELECT 
    gen_random_uuid(),
    student_id,
    'HOME'::public."PhoneType",
    home_phone,
    0,
    NULL
FROM students
WHERE home_phone IS NOT NULL AND home_phone != '';

-- Migrate parent phones
INSERT INTO contact_phones (id, student_id, phone_type, phone_number, "order", notes)
SELECT 
    gen_random_uuid(),
    student_id,
    'OTHER'::public."PhoneType",
    parent_phone,
    1,
    '保護者'
FROM students
WHERE parent_phone IS NOT NULL AND parent_phone != '';

-- Migrate student phones
INSERT INTO contact_phones (id, student_id, phone_type, phone_number, "order", notes)
SELECT 
    gen_random_uuid(),
    student_id,
    'OTHER'::public."PhoneType",
    student_phone,
    2,
    '生徒'
FROM students
WHERE student_phone IS NOT NULL AND student_phone != '';