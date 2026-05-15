/**
 * Migration 006 — Add test_executions and test_execution_results tables
 */
const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', 'data', 'qa-assist.db');

async function run() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No DB file found — schema.sql already includes these tables for fresh installs.');
    return;
  }

  const SQL = await initSqlJs();
  const db  = new SQL.Database(fs.readFileSync(DB_PATH));
  db.run('PRAGMA foreign_keys = ON');

  const existing = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='test_executions'");
  if (existing.length && existing[0].values.length) {
    console.log('test_executions already exists — skipping.');
    db.close();
    return;
  }

  db.run(`
    CREATE TABLE test_executions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_run_id INTEGER NOT NULL,
      environment     TEXT,
      notes           TEXT,
      completed_at    TEXT,
      created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
    )
  `);
  db.run('CREATE INDEX idx_executions_run ON test_executions(analysis_run_id)');

  db.run(`
    CREATE TABLE test_execution_results (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id       INTEGER NOT NULL,
      tc_id              TEXT    NOT NULL,
      tc_titulo          TEXT    NOT NULL,
      status             TEXT    NOT NULL DEFAULT 'pending',
      bug_titulo         TEXT,
      bug_pasos_reales   TEXT,
      bug_severidad      TEXT    DEFAULT 'media',
      bug_ambiente       TEXT,
      bug_screenshot_url TEXT,
      bug_jira_key       TEXT,
      updated_at         TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (execution_id) REFERENCES test_executions(id) ON DELETE CASCADE
    )
  `);

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('Migration 006 complete: test_executions + test_execution_results created.');
}

run().catch(err => { console.error('Migration 006 failed:', err.message); process.exit(1); });
