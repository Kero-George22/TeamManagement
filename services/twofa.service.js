const crypto = require('crypto');
const OTPAuth = require('otpauth');
const AppError = require('../utils/AppError');

// Simple crypto utilities for encrypting the TOTP secret at rest
const algorithm = 'aes-256-cbc';
const secretKey = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret', 'salt', 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(hash) {
  const [ivHex, contentHex] = hash.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(contentHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generate a new TOTP secret for a user
 */
function generateSecret(user) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'SyncUp',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: encrypt(secret.base32),
    uri: totp.toString(),
  };
}

/**
 * Verify a TOTP token
 */
function verifyToken(encryptedSecret, token) {
  try {
    const secret = decrypt(encryptedSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'SyncUp',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  } catch (err) {
    return false;
  }
}

/**
 * Generate 10 backup codes
 */
function generateBackupCodes() {
  const codes = [];
  const hashedCodes = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
    codes.push(code);
    hashedCodes.push(crypto.createHash('sha256').update(code).digest('hex'));
  }

  return { codes, hashedCodes };
}

/**
 * Verify a backup code
 */
function verifyBackupCode(user, code) {
  if (!user.twoFA || !Array.isArray(user.twoFA.backupCodes)) return false;
  
  const hash = crypto.createHash('sha256').update(code.replace(/[-\s]/g, '').toUpperCase()).digest('hex');
  const index = user.twoFA.backupCodes.indexOf(hash);

  if (index !== -1) {
    // Return index so controller can remove it from DB
    return { valid: true, index };
  }

  return { valid: false };
}

module.exports = {
  generateSecret,
  verifyToken,
  generateBackupCodes,
  verifyBackupCode,
};
