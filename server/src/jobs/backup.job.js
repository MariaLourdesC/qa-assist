'use strict';
const cron = require('node-cron');
const { runBackup } = require('../services/backup.service');

const { createLogger } = require('../utils/logger');
const log = createLogger('backup-job');

function startBackupJob() {
  // '0 3 * * *' = 03:00 every day in server local time
  const schedule = process.env.BACKUP_CRON || '0 3 * * *';

  const job = cron.schedule(schedule, async () => {
    log.info({}, 'backup.job: starting scheduled backup');
    try {
      const result = await runBackup();
      log.info(result, 'backup.job: completed successfully');
    } catch (err) {
      log.error({ err: err.message }, 'backup.job: FAILED — check disk space and permissions');
    }
  });

  log.info({ schedule }, 'backup.job: registered');
  return job;
}

module.exports = { startBackupJob };
