// server/scripts/002_add_password_resets.js
require('dotenv').config();
const { getDb, saveDb } = require('../src/db/connection');

async function up() {
  const db = await getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      used_at    TEXT    DEFAULT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prt_hash ON password_reset_tokens(token_hash)`);

  // Add display_name to users if not exists
  try { db.run(`ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT NULL`); }
  catch (e) { if (!e.message.includes('duplicate column')) throw e; }

  saveDb();
  console.log('✓ Migration 002 applied.');
}

up().catch(err => { console.error('Migration 002 failed:', err.message); process.exit(1); });
