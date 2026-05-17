const path = require('path'); const fs = require('fs'); const initSqlJs = require('sql.js');
const DB = path.join(__dirname,'..','data','qa-assist.db');
async function run() {
  if (!fs.existsSync(DB)) { console.log('No DB — schema.sql covers this.'); return; }
  const SQL = await initSqlJs(); const db = new SQL.Database(fs.readFileSync(DB));
  const exists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='step_library'");
  if (exists.length && exists[0].values.length) { console.log('step_library already exists.'); db.close(); return; }
  db.run(`
    CREATE TABLE step_library (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL,
      title      TEXT    NOT NULL,
      category   TEXT    DEFAULT 'setup',
      pasos_json TEXT    NOT NULL DEFAULT '[]',
      created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run('CREATE INDEX idx_step_library_project ON step_library(project_id)');
  fs.writeFileSync(DB, Buffer.from(db.export())); db.close();
  console.log('Migration 011: step_library created.');
}
run().catch(e => { console.error(e.message); process.exit(1); });
