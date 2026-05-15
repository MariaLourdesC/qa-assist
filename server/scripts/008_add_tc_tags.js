const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');
const DB_PATH = path.join(__dirname, '..', 'data', 'qa-assist.db');

async function run() {
  if (!fs.existsSync(DB_PATH)) { console.log('No DB — schema.sql covers this.'); return; }
  const SQL = await initSqlJs();
  const db  = new SQL.Database(fs.readFileSync(DB_PATH));
  const cols = db.exec('PRAGMA table_info(analysis_runs)');
  if (cols[0]?.values.some(r => r[1] === 'tc_tags_json')) { console.log('tc_tags_json already exists.'); db.close(); return; }
  db.run('ALTER TABLE analysis_runs ADD COLUMN tc_tags_json TEXT');
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('Migration 008 complete: tc_tags_json added.');
}
run().catch(err => { console.error(err.message); process.exit(1); });
