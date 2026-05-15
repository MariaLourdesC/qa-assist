// server/scripts/restore.js
// Restore a backup to the live database.
//
// ⚠️  STOP THE SERVER before running this script.
//
// Usage:
//   node scripts/restore.js                          # list available backups
//   node scripts/restore.js <path-to-backup-file>   # restore specific backup
//   node scripts/restore.js backups/qa-assist-backup-2026-05-04T03-00-00.db
'use strict';
require('dotenv').config();
const fs       = require('fs');
const path     = require('path');
const net      = require('net');
const readline = require('readline');

const DB_PATH    = path.join(__dirname, '..', 'data', 'qa-assist.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const PORT       = process.env.PORT || 3001;

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function isPortInUse(port) {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once('error', () => resolve(true));   // port in use
    srv.once('listening', () => { srv.close(); resolve(false); });
    srv.listen(port);
  });
}

function listAvailable() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('\n  No backup directory found at:', BACKUP_DIR);
    return;
  }
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('qa-assist-backup-') && f.endsWith('.db'))
    .sort().reverse();

  if (!files.length) { console.log('\n  No backups found in:', BACKUP_DIR); return; }

  console.log('\n  Available backups:\n');
  files.forEach(f => {
    const s = fs.statSync(path.join(BACKUP_DIR, f));
    console.log(`    ${f}  (${(s.size / 1024).toFixed(1)} KB)`);
  });
}

async function main() {
  const src = process.argv[2];

  if (!src) {
    console.log('\n' + '═'.repeat(62));
    console.log('  QA Assist — Database Restore');
    console.log('═'.repeat(62));
    console.log('\n  Usage: node scripts/restore.js <backup-file>');
    listAvailable();
    console.log('');
    process.exit(0);
  }

  const srcAbs = path.isAbsolute(src) ? src : path.resolve(process.cwd(), src);

  if (!fs.existsSync(srcAbs)) {
    console.error(`\n  ✗ File not found: ${srcAbs}\n`);
    listAvailable();
    process.exit(1);
  }

  const srcKB = (fs.statSync(srcAbs).size / 1024).toFixed(1);

  console.log('\n' + '═'.repeat(62));
  console.log('  QA Assist — Database Restore');
  console.log('═'.repeat(62));
  console.log(`\n  Source : ${srcAbs} (${srcKB} KB)`);
  console.log(`  Target : ${DB_PATH}`);
  console.log('\n  ⚠️  THIS WILL OVERWRITE THE CURRENT DATABASE.');
  console.log('  ⚠️  ALL DATA CREATED AFTER THIS BACKUP WILL BE LOST.');
  console.log('  ⚠️  THE SERVER MUST BE STOPPED BEFORE CONTINUING.\n');

  // Warn if server appears to be running
  const serverUp = await isPortInUse(PORT).catch(() => false);
  if (serverUp) {
    console.error(`  ✗ Port ${PORT} is in use — the server may still be running.`);
    console.error(`    Stop it first (Ctrl+C in the server terminal), then re-run.\n`);
    process.exit(1);
  }

  const answer = await prompt('  Type "yes" to proceed, anything else to cancel: ');
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n  Cancelled. No changes made.\n');
    process.exit(0);
  }

  // Create safety copy before overwriting
  if (fs.existsSync(DB_PATH)) {
    const safeCopy = `${DB_PATH}.pre-restore-${Date.now()}.bak`;
    fs.copyFileSync(DB_PATH, safeCopy);
    console.log(`\n  Safety copy saved: ${safeCopy}`);
    console.log('  (Delete this file manually once you confirm the restore is correct.)');
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.copyFileSync(srcAbs, DB_PATH);

  console.log('\n  ✓ Restore complete.');
  console.log('  Start the server: npm run dev\n');
}

main().catch(err => {
  console.error('\n  ✗ Restore failed:', err.message, '\n');
  process.exit(1);
});
