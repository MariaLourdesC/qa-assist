'use strict';
/**
 * logger.js — centralised pino factory
 *
 * Usage:
 *   const { rootLogger, createLogger } = require('../utils/logger');
 *
 *   // root (no service label)
 *   rootLogger.info('server started');
 *
 *   // child with service label — preferred in every module
 *   const log = createLogger('parser-bdd');
 *   log.warn({ story_id: 42 }, 'ambiguity count high');
 *
 * Env vars:
 *   LOG_LEVEL   trace|debug|info|warn|error|fatal  (default: debug in dev, info in prod)
 *   LOG_FILE    absolute path → write JSON to rotating file (requires pino-roll)
 *   NODE_ENV    'production' → JSON stdout; else pino-pretty
 */
const pino = require('pino');
const crypto = require('crypto');

const isProd  = process.env.NODE_ENV === 'production';
const level   = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');
const logFile = process.env.LOG_FILE  || null;

// ── Sensitive field redaction ─────────────────────────────────────────────
// Redacts at top level AND one level deep (e.g. body.password, req.headers.*)
const redact = {
  paths: [
    'password', 'password_hash',
    'token', 'access_token', 'refresh_token',
    'authorization', 'cookie',
    '*.password', '*.password_hash',
    '*.token', '*.access_token', '*.refresh_token',
    '*.authorization', '*.cookie',
    'req.headers.authorization',
    'req.headers.cookie'
  ],
  censor: '[REDACTED]'
};

// ── Transport selection ───────────────────────────────────────────────────
function buildTransport() {
  if (logFile) {
    // File output with daily rotation.
    // Requires: npm install pino-roll
    // Falls back gracefully if pino-roll is not installed.
    try {
      require.resolve('pino-roll');
      return {
        target: 'pino-roll',
        options: {
          file:      logFile,
          frequency: 'daily',
          mkdir:     true,
          extension: '.log'
        }
      };
    } catch {
      process.stderr.write(
        '[logger] LOG_FILE is set but pino-roll is not installed. ' +
        'Run: npm install pino-roll\n' +
        '[logger] Falling back to stdout.\n'
      );
    }
  }

  if (!isProd) {
    return {
      target: 'pino-pretty',
      options: {
        colorize:      true,
        translateTime: 'HH:MM:ss.l',
        ignore:        'pid,hostname',
        messageKey:    'msg'
      }
    };
  }

  // Production: structured JSON to stdout (pino's default — no transport needed)
  return undefined;
}

// ── Root logger ───────────────────────────────────────────────────────────
const transport = buildTransport();

const rootLogger = pino(
  {
    level,
    redact,
    base:       { service: 'qa-assist' },
    timestamp:  pino.stdTimeFunctions.isoTime,
    formatters: {
      level: label => ({ level: label })  // emit level as string, not number
    }
  },
  transport
    ? pino.transport(transport)
    : undefined
);

// ── Factory ───────────────────────────────────────────────────────────────
/**
 * Returns a child logger that adds `{ service }` to every log line.
 *
 * @param {string} service  e.g. 'parser-bdd', 'auth', 'backup'
 * @param {object} [extra]  any extra fields to bind
 */
function createLogger(service, extra = {}) {
  return rootLogger.child({ service, ...extra });
}

// ── Request ID helper (used by request logger middleware) ─────────────────
function newRequestId() {
  return crypto.randomUUID();   // Node 14.17+ — no uuid package needed
}

module.exports = { rootLogger, createLogger, newRequestId };
