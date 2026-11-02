CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  first TEXT NOT NULL,
  last TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  birth_day INTEGER,
  birth_month INTEGER,
  phone TEXT,
  email_consent INTEGER NOT NULL DEFAULT 0,
  sms_consent INTEGER NOT NULL DEFAULT 0,
  province TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_slug ON reviews (slug);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  first TEXT NOT NULL,
  last TEXT NOT NULL,
  salt TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  birth_day INTEGER,
  birth_month INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL,
  name TEXT NOT NULL,
  photo_key TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  decided_at TEXT,
  card_seq INTEGER UNIQUE,
  card_id TEXT UNIQUE,
  title TEXT
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  first TEXT NOT NULL,
  province TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  province TEXT,
  phone TEXT,
  city TEXT,
  country TEXT,
  bio TEXT,
  style_json TEXT,
  prefs_json TEXT,
  avatar_key TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  stripe_session TEXT UNIQUE,
  status TEXT NOT NULL,
  currency TEXT,
  total INTEGER,
  items_json TEXT,
  ship_json TEXT,
  email TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_user ON orders (user_id);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  label TEXT,
  name TEXT,
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  region TEXT,
  postal TEXT,
  country TEXT,
  phone TEXT,
  is_default INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS addresses_user ON addresses (user_id);

CREATE TABLE IF NOT EXISTS saved (
  user_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, slug)
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets (user_id);
