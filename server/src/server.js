'use strict';
require('dotenv').config();
const app = require('./app');
const { getDb, closeDb } = require('./db/connection');
const { startBackupJob } = require('./jobs/backup.job');
const { rootLogger } = require('./utils/logger');

const log  = rootLogger;
const PORT = process.env.PORT || 3001;

getDb().then(() => {
  app.listen(PORT, () => {
    log.info({ port: PORT }, 'server started');
    log.debug({ health: `http://localhost:${PORT}/api/health` }, 'endpoints ready');
  });

  startBackupJob();

}).catch(err => {
  log.fatal({ err: err.message, stack: err.stack }, 'database init failed — exiting');
  process.exit(1);
});

process.on('SIGINT', () => {
  log.info({}, 'SIGINT received — shutting down');
  closeDb();
  process.exit(0);
});
