/**
 * Migration 004 — Add user_id to analysis_cache + implement proper isolation
 *
 * The analysis_cache table was scaffolded but never used (all cache_keys are NULL
 * in analysis_runs). This migration adds user_id so future cache writes are
 * isolated per user, preventing cross-user LLM result leaks.
 *
 * Safe to run on empty table (no data to migrate).
 */
const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', 'data', 'qa-assist.db');

async function run() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No DB file found — nothing to migrate (schema.sql already includes user_id).');
    return;
  }

  const SQL = await initSqlJs();
  const db  = new SQL.Database(fs.readFileSync(DB_PATH));
  db.run('PRAGMA foreign_keys = ON');

  // Check if user_id already exists
  const cols = db.exec("PRAGMA table_info(analysis_cache)");
  const colNames = cols.length ? cols[0].values.map(r => r[1]) : [];

  if (colNames.includes('user_id')) {
    console.log('user_id already present in analysis_cache — skipping.');
    db.close();
    return;
  }

  // The table has never had data (cache_key is always NULL in analysis_runs).
  // Safest approach: add the column (nullable for backward compat), then verify.
  db.run('ALTER TABLE analysis_cache ADD COLUMN user_id INTEGER');
  db.run('CREATE INDEX IF NOT EXISTS idx_analysis_cache_user ON analysis_cache(user_id)');

  // Persist
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('Migration 004 complete: user_id added to analysis_cache.');
}

run().catch(err => { console.error('Migration 004 failed:', err.message); process.exit(1); });
