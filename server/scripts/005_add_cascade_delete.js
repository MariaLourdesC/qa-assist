/**
 * Migration 005 — Add ON DELETE CASCADE to foreign keys
 *
 * SQLite does not support ALTER TABLE to modify FK constraints, so each table
 * must be recreated. The pattern is:
 *   1. PRAGMA foreign_keys = OFF  (suppress FK checks during surgery)
 *   2. Rename old table → _old
 *   3. Create new table with correct FKs
 *   4. Copy all rows
 *   5. Drop _old table
 *   6. Recreate indexes
 *   7. PRAGMA foreign_key_check  (verify no orphaned rows)
 *   8. PRAGMA foreign_keys = ON
 *
 * Tables affected:
 *   stories          project_id  → projects(id)      ON DELETE CASCADE
 *   analysis_runs    story_id    → stories(id)        ON DELETE CASCADE
 *   analysis_feedback analysis_run_id → analysis_runs(id) ON DELETE CASCADE
 */
const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', 'data', 'qa-assist.db');

async function run() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No DB file found — nothing to migrate (schema.sql already includes CASCADE).');
    return;
  }

  const SQL = await initSqlJs();
  const db  = new SQL.Database(fs.readFileSync(DB_PATH));

  // Verify the migration hasn't already run by checking stories FK definition
  const storyInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='stories'");
  const storySql  = storyInfo[0]?.values[0]?.[0] || '';
  if (storySql.includes('ON DELETE CASCADE')) {
    console.log('CASCADE already present on stories — migration already applied, skipping.');
    db.close();
    return;
  }

  db.run('PRAGMA foreign_keys = OFF');

  // ── stories ──────────────────────────────────────────────────────────────
  db.run('ALTER TABLE stories RENAME TO stories_old');
  db.run(`
    CREATE TABLE stories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL,
      titulo      TEXT    NOT NULL,
      modulo      TEXT,
      descripcion TEXT    NOT NULL,
      fuente      TEXT,
      notas_qa    TEXT,
      estado      TEXT    NOT NULL DEFAULT 'draft',
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id     INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  db.run('INSERT INTO stories SELECT * FROM stories_old');
  db.run('DROP TABLE stories_old');

  // ── analysis_runs ─────────────────────────────────────────────────────────
  db.run('ALTER TABLE analysis_runs RENAME TO analysis_runs_old');
  db.run(`
    CREATE TABLE analysis_runs (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id             INTEGER NOT NULL,
      version              INTEGER NOT NULL,
      analysis_mode        TEXT    NOT NULL,
      prompt_version       TEXT,
      input_snapshot_json  TEXT    NOT NULL,
      parser_output_json   TEXT    NOT NULL,
      classification_json  TEXT    NOT NULL,
      local_output_json    TEXT    NOT NULL,
      llm_output_json      TEXT,
      final_output_json    TEXT    NOT NULL,
      quality_checks_json  TEXT    NOT NULL,
      score_ambiguedad     INTEGER,
      score_cobertura      INTEGER,
      score_complejidad    INTEGER,
      cache_key            TEXT,
      created_at           TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
    )
  `);
  db.run('INSERT INTO analysis_runs SELECT * FROM analysis_runs_old');
  db.run('DROP TABLE analysis_runs_old');
  db.run('CREATE INDEX IF NOT EXISTS idx_analysis_runs_story_id ON analysis_runs(story_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_analysis_runs_cache_key ON analysis_runs(cache_key)');

  // ── analysis_feedback ─────────────────────────────────────────────────────
  db.run('ALTER TABLE analysis_feedback RENAME TO analysis_feedback_old');
  db.run(`
    CREATE TABLE analysis_feedback (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_run_id INTEGER NOT NULL,
      utilidad        TEXT    NOT NULL,
      comentario      TEXT,
      copied_blocks_json TEXT,
      created_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
    )
  `);
  db.run('INSERT INTO analysis_feedback SELECT * FROM analysis_feedback_old');
  db.run('DROP TABLE analysis_feedback_old');

  // Verify no orphaned rows were left behind
  const check = db.exec('PRAGMA foreign_key_check');
  if (check.length && check[0].values.length > 0) {
    db.close();
    throw new Error(`FK integrity check failed: ${JSON.stringify(check[0].values)}`);
  }

  db.run('PRAGMA foreign_keys = ON');

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('Migration 005 complete: ON DELETE CASCADE added to stories, analysis_runs, analysis_feedback.');
}

run().catch(err => { console.error('Migration 005 failed:', err.message); process.exit(1); });
