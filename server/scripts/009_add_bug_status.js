const path = require('path'); const fs = require('fs'); const initSqlJs = require('sql.js');
const DB = path.join(__dirname,'..','data','qa-assist.db');
async function run() {
  if (!fs.existsSync(DB)) { console.log('No DB.'); return; }
  const SQL = await initSqlJs(); const db = new SQL.Database(fs.readFileSync(DB));
  const cols = db.exec('PRAGMA table_info(test_execution_results)');
  if (cols[0]?.values.some(r => r[1] === 'bug_status')) { console.log('bug_status exists.'); db.close(); return; }
  db.run("ALTER TABLE test_execution_results ADD COLUMN bug_status TEXT DEFAULT 'open'");
  fs.writeFileSync(DB, Buffer.from(db.export())); db.close();
  console.log('Migration 009: bug_status added.');
}
run().catch(e => { console.error(e.message); process.exit(1); });
