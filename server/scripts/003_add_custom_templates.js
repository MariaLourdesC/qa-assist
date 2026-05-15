require('dotenv').config();
const { getDb, saveDb } = require('../src/db/connection');

async function up() {
  const db = await getDb();
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_templates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          TEXT    NOT NULL,
      glossary_json TEXT    NOT NULL DEFAULT '[]',
      rules_json    TEXT    NOT NULL DEFAULT '[]',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_templates_user ON custom_templates(user_id)`);
  saveDb();
  console.log('✓ Migration 003 applied: custom_templates table created.');
}

up().catch(err => { console.error('Migration 003 failed:', err.message); process.exit(1); });
