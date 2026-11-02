-- Paste all of this into the D1 console once. It adds the tables for orders, addresses, saved Pieces, and profiles.

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
