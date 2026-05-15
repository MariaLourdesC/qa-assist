'use strict';
// Admin emails are configured via ADMIN_EMAIL env var (comma-separated).
// Example: ADMIN_EMAIL=alice@example.com,bob@example.com
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAIL || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
);

module.exports = function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!ADMIN_EMAILS.has(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden — admin only' });
  }
  next();
};
