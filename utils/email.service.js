// Email service using nodemailer. Falls back to console when credentials are not provided.
const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS; // app password or service-specific

let transporter = null;
if (GMAIL_USER && GMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
}

async function sendMail(opts) {
  const mail = {
    from: process.env.EMAIL_FROM || (GMAIL_USER || 'no-reply@example.com'),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  };

  if (transporter) {
    return transporter.sendMail(mail);
  }

  // Fallback: log the email for development
  console.log('Email (mock) to:', mail.to);
  console.log('Subject:', mail.subject);
  console.log('HTML:', mail.html);
  return Promise.resolve({ ok: true, mock: true });
}

function verificationEmail(to, token) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify your email</h2>
      <p>Your verification code is:</p>
      <h1 style="background: #f4f4f5; padding: 10px 20px; letter-spacing: 5px; text-align: center; border-radius: 8px;">${token}</h1>
      <p>Please enter this code on the verification page to complete your registration.</p>
    </div>
  `;
  return sendMail({ to, subject: 'Your Verification Code', html, text: `Your verification code is: ${token}` });
}

function passwordResetEmail(to, token) {
  const resetUrl = (process.env.PASSWORD_RESET_URL || `https://example.com/reset`) + `?token=${token}`;
  const html = `<p>Reset your password by clicking <a href="${resetUrl}">this link</a>. The link expires in ${process.env.VERIFICATION_HOURS || 24} hours.</p>`;
  return sendMail({ to, subject: 'Reset your password', html, text: `Reset: ${resetUrl}` });
}

function passwordChangedEmail(to) {
  const url = process.env.ACCOUNT_URL || `https://example.com/account`;
  const html = `<p>Your password was changed. If this wasn't you, visit <a href="${url}">your account</a> or contact support.</p>`;
  return sendMail({ to, subject: 'Your password was changed', html, text: `Visit: ${url}` });
}

module.exports = { sendMail, verificationEmail, passwordResetEmail, passwordChangedEmail };
