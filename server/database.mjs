import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const file = resolve(process.env.DATABASE_PATH || "./data/lifedesk.sqlite");
mkdirSync(dirname(file), { recursive: true });
export const db = new DatabaseSync(file);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  verified_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('verify','reset')), token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL, used_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS money_accounts (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, percentage INTEGER NOT NULL CHECK(percentage BETWEEN 0 AND 100),
  balance_cents INTEGER NOT NULL DEFAULT 0, color TEXT NOT NULL DEFAULT 'yellow',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id,name)
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, color TEXT NOT NULL, budget_cents INTEGER,
  UNIQUE(user_id,name)
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES money_accounts(id),
  kind TEXT NOT NULL CHECK(kind IN ('income','expense','transfer_in','transfer_out')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), source TEXT, category TEXT,
  note TEXT, receipt_number TEXT NOT NULL UNIQUE, occurred_at TEXT NOT NULL,
  group_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS transactions_user_date ON transactions(user_id, occurred_at DESC);
CREATE TABLE IF NOT EXISTS academic_units (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  programme TEXT NOT NULL, year INTEGER NOT NULL, semester INTEGER NOT NULL,
  code TEXT NOT NULL, title TEXT NOT NULL, lecturer TEXT, credit_hours INTEGER NOT NULL DEFAULT 3,
  cat_score REAL, exam_score REAL, exam_date TEXT, study_progress INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id,code,year,semester)
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES academic_units(id) ON DELETE CASCADE, title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', pdf_page INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, type TEXT NOT NULL,
  location TEXT, color TEXT NOT NULL DEFAULT 'yellow', recurrence TEXT, reminder_minutes INTEGER
);
CREATE INDEX IF NOT EXISTS events_user_start ON events(user_id,starts_at);
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, type TEXT NOT NULL, category TEXT NOT NULL,
  target_date TEXT NOT NULL, target_value REAL, current_value REAL NOT NULL DEFAULT 0,
  account_id INTEGER REFERENCES money_accounts(id), status TEXT NOT NULL DEFAULT 'not_started',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY, goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL, completed_at TEXT
);
`);

export function transaction(work) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
