/**
 * Email utility using nodemailer.
 * Reads SMTP config from environment variables.
 * If SMTP_HOST is not set, falls back to dev mode (logs token to console, no email sent).
 */
const nodemailer = require('nodemailer');
const { createLogger } = require('./logger');
const log = createLogger('mailer');

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Send a password reset email.
 * @param {string} to      - recipient email
 * @param {string} token   - raw reset token
 * @returns {Promise<{sent: boolean, dev_token?: string}>}
 */
async function sendPasswordReset(to, token) {
  const appUrl  = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  const from    = process.env.SMTP_FROM || `"QA Assist" <no-reply@qa-assist.local>`;
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  if (!isConfigured()) {
    // Dev mode — log token, no email
    log.warn({ to, token }, 'mailer: SMTP not configured — dev token logged');
    return { sent: false, dev_token: token };
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from,
      to,
      subject: 'Restablecer contraseña — QA Assist',
      text: `Hacé click en el siguiente enlace para restablecer tu contraseña:\n\n${resetUrl}\n\nEl enlace expira en 30 minutos.\nSi no solicitaste esto, ignorá este mensaje.`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#10b981;margin:0 0 16px">QA Assist</h2>
          <p style="color:#334155;margin:0 0 16px">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-bottom:16px">
            Restablecer contraseña
          </a>
          <p style="color:#64748b;font-size:13px;margin:0">El enlace expira en 30 minutos.<br>Si no solicitaste esto, ignorá este mensaje.</p>
        </div>`
    });
    log.info({ to }, 'mailer: password reset email sent');
    return { sent: true };
  } catch (err) {
    log.error({ err: err.message, to }, 'mailer: failed to send email');
    throw new Error(`No se pudo enviar el email: ${err.message}`);
  }
}

module.exports = { sendPasswordReset, isConfigured };
