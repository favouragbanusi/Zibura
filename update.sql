-- Run this only if you already ran an earlier schema.sql. Run each line once.
ALTER TABLE applications ADD COLUMN title TEXT;
ALTER TABLE users ADD COLUMN birth_day INTEGER;
ALTER TABLE users ADD COLUMN birth_month INTEGER;
ALTER TABLE waitlist ADD COLUMN birth_day INTEGER;
ALTER TABLE waitlist ADD COLUMN birth_month INTEGER;
ALTER TABLE waitlist ADD COLUMN phone TEXT;
ALTER TABLE waitlist ADD COLUMN email_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE waitlist ADD COLUMN sms_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE waitlist ADD COLUMN province TEXT;
