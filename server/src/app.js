// server/src/app.js
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const { rootLogger } = require('./utils/logger');
const requestLogger  = require('./middleware/requestLogger');

const app = express();

// ── CORS — validate CORS_ORIGIN is set in production ─────────────────────
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  rootLogger.error('CORS_ORIGIN must be set in production. Refusing to start.');
  process.exit(1);
}

const corsOrigin = process.env.NODE_ENV === 'production'
  ? process.env.CORS_ORIGIN
  : (origin, cb) => cb(null, true);           // any origin in dev

app.use(cors({ origin: corsOrigin, credentials: true }));

// ── Body parsing — explicit 1 MB limit ───────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(requestLogger);

// ── Content-Type guard — reject non-JSON mutation requests ────────────────
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.path !== '/api/health') {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

// ── Health (public) ───────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const { getDb } = require('./db/connection');
    const db = await getDb();
    db.exec('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// ── Auth routes (public — they handle auth internally) ────────────────────
app.use('/auth', require('./routes/auth'));

// ── Admin routes (auth + admin-only) ─────────────────────────────────────
app.use('/admin', require('./routes/admin'));

// ── Custom templates ──────────────────────────────────────────────────────
app.use('/api/templates', require('./routes/templates'));

// ── Jira integration ──────────────────────────────────────────────────────
app.use('/api/jira', require('./routes/jira'));

// ── Test executions & bug reports ─────────────────────────────────────────
app.use('/api/executions', require('./routes/executions'));

// ── Protected API routes ──────────────────────────────────────────────────
app.use('/api/projects',        require('./routes/projects'));
app.use('/api/stories',         require('./routes/stories'));
app.use('/api/analyses',        require('./routes/analyses'));
app.use('/api/feedback',        require('./routes/feedback'));

// ── Test/dev routes (only available outside production) ──────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/parser-test',     require('./routes/parser-test'));
  app.use('/api/classifier-test', require('./routes/classifier-test'));
  app.use('/api/rules-test',      require('./routes/rules-test'));
}

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  rootLogger.error({
    err:        err.message,
    stack:      err.stack,
    request_id: req.requestId ?? null,
    method:     req.method,
    path:       req.path
  }, 'unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
