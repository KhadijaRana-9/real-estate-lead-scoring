// Same gated-provider contract as shared/storage and the billing Stripe
// provider: isConfigured() tells the truth, sendMail() throws a clear
// 503 instead of pretending to send. Adding SMTP_HOST/SMTP_USER/
// SMTP_PASS is the only step left to make this real - callers (agency
// invites, CRM reminders) already treat "not configured" as a normal,
// expected outcome rather than an error.
let transporter = null;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html }) {
  const client = getTransporter();
  if (!client) return { sent: false, reason: 'Email is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing).' };

  await client.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  return { sent: true };
}

module.exports = { isConfigured, sendMail };
