// server/src/routes/auth.js
const express        = require('express');
const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const crypto         = require('crypto');
const rateLimit      = require('express-rate-limit');
const { getDb, saveDb } = require('../db/connection');
const authenticate   = require('../middleware/authenticate');

const { sendPasswordReset } = require('../utils/mailer');
const router = express.Router();

const BCRYPT_ROUNDS      = 10;
const ACCESS_TTL_SEC     = 15 * 60;
const REFRESH_TTL_SEC    = 7 * 24 * 3600;
const RESET_TTL_SEC      = 30 * 60;       // 30 min

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'Lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/'
};

// ── helpers ───────────────────────────────────────────────────────────────

function rowsToObjects(resultSet) {
  const { columns, values } = resultSet;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  });
}

function issueAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL_SEC }
  );
}

function issueRefreshToken() {
  const raw  = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function setTokenCookies(res, accessToken, refreshRaw) {
  res.cookie('access_token', accessToken, {
    ...COOKIE_BASE,
    maxAge: ACCESS_TTL_SEC * 1000
  });
  if (refreshRaw) {
    res.cookie('refresh_token', refreshRaw, {
      ...COOKIE_BASE,
      maxAge: REFRESH_TTL_SEC * 1000,
      path: '/auth'  // scope refresh cookie to /auth only
    });
  }
}

function clearTokenCookies(res) {
  res.clearCookie('access_token', COOKIE_BASE);
  res.clearCookie('refresh_token', { ...COOKIE_BASE, path: '/auth' });
}

// ── rate limits ───────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Try again in an hour.' }
});

// ── POST /auth/register ───────────────────────────────────────────────────

router.post('/register', registerLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  try {
    const db = await getDb();
    const existing = db.exec('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length && existing[0].values.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email.toLowerCase(), hash]);
    const idResult = db.exec('SELECT last_insert_rowid() AS id');
    const userId = idResult[0].values[0][0];

    const user = { id: userId, email: email.toLowerCase() };
    const accessToken = issueAccessToken(user);
    const { raw, hash: tokenHash } = issueRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000).toISOString();
    db.run(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );
    saveDb();

    setTokenCookies(res, accessToken, raw);
    return res.status(201).json({ user: { id: userId, email: user.email } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const db = await getDb();
    const rows = db.exec('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = rows.length && rows[0].values.length ? rowsToObjects(rows[0])[0] : null;

    // Always compare to avoid timing attacks even when user is not found
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : (await bcrypt.compare(password, dummyHash), false);

    if (!valid || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = issueAccessToken(user);
    const { raw, hash: tokenHash } = issueRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000).toISOString();
    db.run(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );
    saveDb();

    setTokenCookies(res, accessToken, raw);
    return res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  const raw = req.cookies?.refresh_token;
  if (!raw) return res.status(401).json({ error: 'No refresh token' });

  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  try {
    const db = await getDb();
    const rows = db.exec(
      `SELECT rt.user_id, u.email
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')`,
      [hash]
    );
    if (!rows.length || !rows[0].values.length) {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'Refresh token invalid or expired' });
    }
    const { user_id, email } = rowsToObjects(rows[0])[0];

    // Rotate: delete old, issue new
    db.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [hash]);
    const user = { id: user_id, email };
    const accessToken = issueAccessToken(user);
    const { raw: newRaw, hash: newHash } = issueRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000).toISOString();
    db.run(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user_id, newHash, expiresAt]
    );
    saveDb();

    setTokenCookies(res, accessToken, newRaw);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req, res) => {
  const raw = req.cookies?.refresh_token;
  if (raw) {
    try {
      const db = await getDb();
      const hash = crypto.createHash('sha256').update(raw).digest('hex');
      db.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [hash]);
      saveDb();
    } catch (_) { /* best-effort */ }
  }
  clearTokenCookies(res);
  return res.json({ ok: true });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec('SELECT id, email, display_name, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length || !rows[0].values.length) return res.status(404).json({ error: 'User not found' });
    const [id, email, display_name, created_at] = rows[0].values[0];
    return res.json({ user: { id, email, display_name, created_at } });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ── PATCH /auth/profile ───────────────────────────────────────────────────

router.patch('/profile', authenticate, profileLimiter, async (req, res) => {
  const { display_name } = req.body || {};
  try {
    const db = await getDb();
    db.run('UPDATE users SET display_name = ? WHERE id = ?',
      [(display_name || '').trim().slice(0, 100) || null, req.user.id]);
    saveDb();
    return res.json({ ok: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ── POST /auth/change-password ────────────────────────────────────────────

router.post('/change-password', authenticate, changePwLimiter, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'new_password must be at least 8 characters' });
  }
  try {
    const db = await getDb();
    const rows = db.exec('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length || !rows[0].values.length) return res.status(404).json({ error: 'User not found' });

    const currentHash = rows[0].values[0][0];
    if (currentHash === '[disabled]' || !(await bcrypt.compare(current_password, currentHash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    // Invalidate all refresh tokens (force re-login on other devices)
    db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
    saveDb();
    clearTokenCookies(res);
    return res.json({ ok: true, message: 'Password changed. Please log in again.' });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ── POST /auth/forgot-password ────────────────────────────────────────────
// In dev (NODE_ENV !== 'production'): returns token directly.
// In prod: configure SMTP and send email instead.

const forgotLimiter    = rateLimit({ windowMs: 15 * 60 * 1000, max: 5,  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many reset attempts. Try again in 15 minutes.' } });
const changePwLimiter  = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many password changes. Try again in an hour.' } });
const profileLimiter   = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many profile updates. Try again in an hour.' } });

router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const db = await getDb();
    const rows = db.exec('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    // Always return 200 to avoid email enumeration
    if (!rows.length || !rows[0].values.length) {
      return res.json({ ok: true, dev_token: null });
    }
    const userId = rows[0].values[0][0];

    // Invalidate previous tokens for this user
    db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);

    const raw  = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_SEC * 1000).toISOString();
    db.run('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, hash, expiresAt]);
    saveDb();

    // Send reset email (falls back to dev token if SMTP not configured)
    const result = await sendPasswordReset(email.toLowerCase(), raw);

    return res.json({
      ok: true,
      dev_token: result.dev_token || undefined,  // only present when SMTP not configured
      expires_in: RESET_TTL_SEC
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ── POST /auth/reset-password ─────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body || {};
  if (!token || !new_password) {
    return res.status(400).json({ error: 'token and new_password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'new_password must be at least 8 characters' });
  }
  try {
    const db = await getDb();
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const rows = db.exec(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = ? AND expires_at > datetime('now') AND used_at IS NULL`,
      [hash]
    );
    if (!rows.length || !rows[0].values.length) {
      return res.status(400).json({ error: 'Token invalid or expired' });
    }
    const [rowId, userId] = rows[0].values[0];

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    db.run('UPDATE password_reset_tokens SET used_at = datetime(\'now\') WHERE id = ?', [rowId]);
    db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    saveDb();

    return res.json({ ok: true, message: 'Password reset. Please log in.' });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

module.exports = router;
