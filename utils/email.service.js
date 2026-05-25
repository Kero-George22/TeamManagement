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
  const frontendUrl = process.env.FRONTEND_URL || process.env.PASSWORD_RESET_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/app/forgot-password?token=${token}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff; border-radius: 16px;">
      <div style="font-size: 1.4rem; font-weight: 800; margin-bottom: 24px;">
        Team<span style="color: #22c55e;">Forge</span>
      </div>
      <h2 style="font-size: 1.2rem; font-weight: 700; margin: 0 0 8px;">Reset your password</h2>
      <p style="font-size: .9rem; color: #64748b; line-height: 1.6; margin: 0 0 24px;">
        Click the button below to reset your password. The link expires in ${process.env.RESET_HOURS || 1} hour(s).
      </p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 28px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: .95rem;">
        Reset Password
      </a>
      <p style="font-size: .82rem; color: #94a3b8; margin-top: 24px; line-height: 1.5;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: .78rem; color: #94a3b8;">
        Or copy this link into your browser:<br />
        <a href="${resetUrl}" style="color: #3b82f6;">${resetUrl}</a>
      </p>
    </div>
  `;
  return sendMail({ to, subject: 'Reset your TeamForge password', html, text: `Reset your password: ${resetUrl}` });
}

function passwordChangedEmail(to) {
  const frontendUrl = process.env.FRONTEND_URL || process.env.PASSWORD_RESET_URL || 'http://localhost:5173';
  const url = `${frontendUrl}/app/login`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff; border-radius: 16px;">
      <div style="font-size: 1.4rem; font-weight: 800; margin-bottom: 24px;">
        Team<span style="color: #22c55e;">Forge</span>
      </div>
      <h2 style="font-size: 1.2rem; font-weight: 700; margin: 0 0 8px;">Password changed</h2>
      <p style="font-size: .9rem; color: #64748b; line-height: 1.6; margin: 0 0 24px;">
        Your TeamForge password was changed successfully. If this wasn't you, please contact support immediately.
      </p>
      <a href="${url}" style="display: inline-block; padding: 12px 28px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: .95rem;">
        Sign In
      </a>
    </div>
  `;
  return sendMail({ to, subject: 'Your TeamForge password was changed', html, text: `Your password was changed. Sign in: ${url}` });
}

module.exports = { sendMail, verificationEmail, passwordResetEmail, passwordChangedEmail };
