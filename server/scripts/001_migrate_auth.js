// server/scripts/001_migrate_auth.js
// Run once: node scripts/001_migrate_auth.js
require('dotenv').config();
const { getDb, saveDb } = require('../src/db/connection');

async function up() {
  const db = await getDb();

  // 1. users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 2. refresh_tokens — stores SHA-256 hash of token, not plaintext
  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 3. Legacy user for backfill — '[disabled]' is not a valid bcrypt hash, can never log in
  db.run(`
    INSERT OR IGNORE INTO users (email, password_hash)
    VALUES ('legacy@system.local', '[disabled]')
  `);

  const legacyRows = db.exec(`SELECT id FROM users WHERE email = 'legacy@system.local'`);
  const legacyId = legacyRows[0].values[0][0];

  // 4. projects — add user_id, backfill
  try {
    db.run(`ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id)`);
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
    console.log('  projects.user_id already exists, skipping ADD COLUMN');
  }
  db.run(`UPDATE projects SET user_id = ? WHERE user_id IS NULL`, [legacyId]);

  // 5. stories — add user_id, backfill
  try {
    db.run(`ALTER TABLE stories ADD COLUMN user_id INTEGER REFERENCES users(id)`);
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
    console.log('  stories.user_id already exists, skipping ADD COLUMN');
  }
  db.run(`UPDATE stories SET user_id = ? WHERE user_id IS NULL`, [legacyId]);

  // 6. Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_projects_user_id    ON projects(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_stories_user_id     ON stories(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);

  saveDb();
  console.log(`✓ Migration 001 applied. Legacy user id: ${legacyId}`);
  console.log('  Existing projects/stories backfilled to legacy@system.local');
  console.log('  You can delete the legacy user after migrating its data to a real account.');
}

up().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
