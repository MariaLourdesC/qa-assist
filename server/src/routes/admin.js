'use strict';
const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const adminOnly    = require('../middleware/adminOnly');
const { listBackups, runBackup, BACKUP_DIR } = require('../services/backup.service');

// All /admin routes require valid JWT + admin email
router.use(authenticate, adminOnly);

// GET /admin/backups — list local backups
router.get('/backups', (req, res) => {
  try {
    const backups = listBackups();
    res.json({
      backup_dir:  BACKUP_DIR,
      s3_bucket:   process.env.BACKUP_S3_BUCKET || null,
      count:       backups.length,
      // NOTE: when S3 is configured, local files are deleted after upload — list will be empty.
      // TODO: add ListObjectsV2 call to include S3-stored backups in response.
      backups
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/backups — trigger immediate backup
router.post('/backups', async (req, res) => {
  try {
    const result = await runBackup();
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
