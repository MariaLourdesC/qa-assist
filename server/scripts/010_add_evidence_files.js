const path = require('path'); const fs = require('fs'); const initSqlJs = require('sql.js');
const DB = path.join(__dirname,'..','data','qa-assist.db');
async function run() {
  if (!fs.existsSync(DB)) { console.log('No DB.'); return; }
  const SQL = await initSqlJs(); const db = new SQL.Database(fs.readFileSync(DB));
  const cols = db.exec('PRAGMA table_info(test_execution_results)');
  if (cols[0]?.values.some(r => r[1] === 'evidence_files_json')) {
    console.log('evidence_files_json already exists.'); db.close(); return;
  }
  db.run('ALTER TABLE test_execution_results ADD COLUMN evidence_files_json TEXT');
  fs.writeFileSync(DB, Buffer.from(db.export())); db.close();
  console.log('Migration 010: evidence_files_json added.');
}
run().catch(e => { console.error(e.message); process.exit(1); });
