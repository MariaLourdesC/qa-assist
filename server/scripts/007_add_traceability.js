/**
 * Migration 007 — Add traceability_json to analysis_runs
 * Stores AC → TC links as { "CA-001": ["TC-001", "TC-003"], ... }
 */
const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', 'data', 'qa-assist.db');

async function run() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No DB file found — schema.sql already includes traceability_json.');
    return;
  }
  const SQL = await initSqlJs();
  const db  = new SQL.Database(fs.readFileSync(DB_PATH));

  const cols = db.exec('PRAGMA table_info(analysis_runs)');
  const hasCol = cols[0]?.values.some(r => r[1] === 'traceability_json');
  if (hasCol) { console.log('traceability_json already exists — skipping.'); db.close(); return; }

  db.run('ALTER TABLE analysis_runs ADD COLUMN traceability_json TEXT');
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('Migration 007 complete: traceability_json added to analysis_runs.');
}

run().catch(err => { console.error('Migration 007 failed:', err.message); process.exit(1); });
