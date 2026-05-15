'use strict';
const fs   = require('fs');
const path = require('path');
const { getDb } = require('../db/connection');

const { createLogger } = require('../utils/logger');
const log = createLogger('backup');

const BACKUP_DIR    = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
const S3_BUCKET     = process.env.BACKUP_S3_BUCKET || null;
const KEEP_DAILY    = 7;   // days
const KEEP_WEEKLY   = 4;   // weeks
const CACHE_TTL_DAYS = parseInt(process.env.CACHE_TTL_DAYS || '7', 10);

// ── Naming ────────────────────────────────────────────────────────────────

function backupName(now = new Date()) {
  // e.g. qa-assist-backup-2026-05-04T03-00-00.db
  return `qa-assist-backup-${now.toISOString().replace(/:/g, '-').slice(0, 19)}.db`;
}

function parseDate(filename) {
  const m = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
  if (!m) return null;
  return new Date(m[1].replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3'));
}

// ── ISO week key (for weekly grouping) ───────────────────────────────────

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - new Date(Date.UTC(year, 0, 1))) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ── Rotation ──────────────────────────────────────────────────────────────

function rotate(dir) {
  const now      = Date.now();
  const SEVEN_DAYS = KEEP_DAILY * 24 * 3600 * 1000;

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('qa-assist-backup-') && f.endsWith('.db'))
    .map(f => ({ name: f, path: path.join(dir, f), date: parseDate(f) }))
    .filter(f => f.date !== null)
    .sort((a, b) => b.date - a.date); // newest first

  const recent = files.filter(f => now - f.date.getTime() <= SEVEN_DAYS);
  const older  = files.filter(f => now - f.date.getTime() >  SEVEN_DAYS);

  // From older backups: keep newest per ISO week, up to KEEP_WEEKLY weeks
  const weekMap = new Map();
  for (const f of older) {
    const k = isoWeekKey(f.date);
    if (!weekMap.has(k)) weekMap.set(k, f); // sorted newest-first, so first = newest
  }
  const keepWeekly = [...weekMap.values()].slice(0, KEEP_WEEKLY);

  const keep   = new Set([...recent, ...keepWeekly].map(f => f.name));
  const purge  = files.filter(f => !keep.has(f.name));

  let deleted = 0;
  for (const f of purge) {
    try { fs.unlinkSync(f.path); deleted++; }
    catch (e) { log.warn({ file: f.name, err: e.message }, 'backup.rotate: could not delete file'); }
  }
  return { kept: keep.size, deleted };
}

// ── S3 upload ─────────────────────────────────────────────────────────────

async function uploadToS3(localPath, filename) {
  let S3Client, PutObjectCommand;
  try {
    ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
  } catch {
    throw new Error('S3 upload failed — install sdk: npm install @aws-sdk/client-s3');
  }
  const client = new S3Client({});
  const body   = fs.createReadStream(localPath);
  await client.send(new PutObjectCommand({
    Bucket:      S3_BUCKET,
    Key:         `backups/${filename}`,
    Body:        body,
    ContentType: 'application/octet-stream'
  }));
}

// ── Cache purge ───────────────────────────────────────────────────────────

function purgeOldCache(db) {
  try {
    db.run(
      `DELETE FROM analysis_cache WHERE created_at < datetime('now', ?)`,
      [`-${CACHE_TTL_DAYS} days`]
    );
    const result = db.exec('SELECT changes() AS n');
    const deleted = result[0]?.values[0]?.[0] ?? 0;
    log.info({ deleted, ttl_days: CACHE_TTL_DAYS }, 'cache: purged expired entries');
    return deleted;
  } catch (err) {
    log.warn({ err: err.message }, 'cache: purge failed');
    return 0;
  }
}

// ── Core backup ───────────────────────────────────────────────────────────

async function runBackup() {
  const started = Date.now();
  const now     = new Date();
  const name    = backupName(now);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dest = path.join(BACKUP_DIR, name);

  try {
    const db = await getDb();

    // 1. Purge expired cache entries before exporting (backup is smaller + cache is clean)
    const cachePurged = purgeOldCache(db);

    // 2. Hot-backup: export live in-memory DB (consistent snapshot, not a raw file copy)
    const data = db.export();                    // Uint8Array — safe while server is running
    fs.writeFileSync(dest, Buffer.from(data));

    const size = fs.statSync(dest).size;
    log.info({ file: name, bytes: size, ms: Date.now() - started }, 'backup: written');

    if (S3_BUCKET) {
      await uploadToS3(dest, name);
      fs.unlinkSync(dest);                       // remove local copy after S3 upload
      log.info({ bucket: S3_BUCKET, key: `backups/${name}` }, 'backup: uploaded to S3, local copy removed');
      return { ok: true, name, destination: 's3', bytes: size, cachePurged };
    } else {
      const { kept, deleted } = rotate(BACKUP_DIR);
      log.info({ kept, deleted, cachePurged }, 'backup: rotation complete');
      return { ok: true, name, destination: 'local', bytes: size, kept, deleted, cachePurged };
    }
  } catch (err) {
    log.error({ file: name, err: err.message }, 'backup: FAILED');
    try { fs.unlinkSync(dest); } catch {}        // clean up partial file
    throw err;
  }
}

// ── List local backups (for admin endpoint) ───────────────────────────────

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('qa-assist-backup-') && f.endsWith('.db'))
    .map(f => {
      const p    = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(p);
      return { name: f, bytes: stat.size, created_at: parseDate(f)?.toISOString() ?? null };
    })
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

module.exports = { runBackup, listBackups, BACKUP_DIR };
