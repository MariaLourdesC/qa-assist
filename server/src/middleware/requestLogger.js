'use strict';
const { createLogger, newRequestId } = require('../utils/logger');

const log = createLogger('http');

/**
 * Request logging middleware.
 * Logs on response finish: method, path, status, duration_ms, user_id, request_id.
 * Attaches req.requestId so downstream handlers can reference it.
 */
module.exports = function requestLogger(req, res, next) {
  const requestId = newRequestId();
  const started   = Date.now();

  // Make request ID available to route handlers
  req.requestId = requestId;

  res.on('finish', () => {
    const duration = Date.now() - started;
    const level    = res.statusCode >= 500 ? 'error'
                   : res.statusCode >= 400 ? 'warn'
                   : 'info';

    log[level]({
      request_id:  requestId,
      method:      req.method,
      path:        req.path,
      status:      res.statusCode,
      duration_ms: duration,
      user_id:     req.user?.id ?? null   // null if unauthenticated
    }, 'request');
  });

  next();
};
