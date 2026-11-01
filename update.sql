-- Run this only if you already ran an earlier schema.sql. Paste all of it once.
ALTER TABLE applications ADD COLUMN title TEXT;
ALTER TABLE users ADD COLUMN birth_day INTEGER;
ALTER TABLE users ADD COLUMN birth_month INTEGER;
ALTER TABLE waitlist ADD COLUMN birth_day INTEGER;
ALTER TABLE waitlist ADD COLUMN birth_month INTEGER;
ALTER TABLE waitlist ADD COLUMN phone TEXT;
ALTER TABLE waitlist ADD COLUMN email_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE waitlist ADD COLUMN sms_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE waitlist ADD COLUMN province TEXT;

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  first TEXT NOT NULL,
  province TEXT,
  created_at TEXT NOT NULL
);
