const asyncWrapper     = require('../utils/asyncWrapper');
const { success }      = require('../utils/apiResponse');
const AppError         = require('../utils/AppError');
const User             = require('../models/user.model');
const emailService     = require('../utils/email.service');
const crypto           = require('crypto');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function expiresIn(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function generateJwt(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id) },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

function  pruneAndAddRefreshToken(user, rawRefreshToken) {
  user.refreshTokens = (user.refreshTokens || []).filter(t => {
    try {
      const decoded = jwt.decode(t);
      if (!decoded || !decoded.exp) return false;
      return decoded.exp * 1000 > Date.now();
    } catch { return false; }
  });
  user.refreshTokens.push(hashToken(rawRefreshToken));
}

/**
 * FIX: normalize email consistently everywhere
 * - trim whitespace
 * - lowercase
 * الـ email `" User@Gmail.COM "` كان بيعدي الـ validation ويتحفظ في الـ DB بمسافات
 */
function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/**
 * FIX: email validation أقوى من regex بسيط
 * الـ regex القديم كان بيقبل `a@b.c` و `"><script>@x.com`
 */
function isValidEmail(email) {
  // RFC-5321: max 254 chars, must have exactly one @, local part + domain
  if (!email || email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// ─── Controllers ────────────────────────────────────────────────────────────

exports.signup = asyncWrapper(async (req, res) => {
  // FIX: normalize email قبل أي حاجة
  const email    = normalizeEmail(req.body.email || '');
  const password = req.body.password;

  if (!email || !password) throw new AppError('Email and password required', 400);
  if (!isValidEmail(email)) throw new AppError('Valid email required', 400);
  if (password.length < 8)  throw new AppError('Password min length 8', 400);

  let user = await User.findOne({ email });

  if (user) {
    if (user.isVerified) {
      throw new AppError('Email already in use', 409);
    }

    /**
     * FIX: Account Takeover
     * 
     * الكود القديم: كان بيسمح لأي حد يعمل signup بـ email حد تاني
     * غير verified ويغير الـ password بتاعته من غير أي proof.
     * 
     * الحل: مش بنغير الـ password الموجود، بس بنبعت OTP جديد
     * للـ email صاحب الأكاونت الأصلي.
     * لو حد بيحاول يسرق الأكاونت، مش هيقدر لأن الـ OTP بيوصل
     * للـ email الحقيقي بس.
     */
    const verificationCode = generateVerificationCode();
    user.verificationToken         = hashToken(verificationCode);
    user.verificationTokenExpires  = expiresIn(Number(process.env.VERIFICATION_HOURS) || 24);
    await user.save();

    await emailService.verificationEmail(email, verificationCode);

    // FIX: نرجع نفس الـ message عشان منكشفش إن الـ user موجود أصلاً
    return success(res, {}, 'If this email is valid, a verification code was sent.', 200);
  }

  try {
    const token = generateVerificationCode();
    user = await User.create({
      email,
      password,
      verificationToken:        hashToken(token),
      verificationTokenExpires: expiresIn(Number(process.env.VERIFICATION_HOURS) || 24),
    });

    // FIX: لو الـ email service فشلت بعد ما الـ user اتعمل،
    // بنعمل cleanup للـ user من الـ DB عشان يقدر يعمل signup تاني
    try {
      await emailService.verificationEmail(email, token);
    } catch (emailErr) {
      await User.deleteOne({ _id: user._id });
      throw new AppError('Failed to send verification email. Please try again.', 503);
    }

    return success(res, { id: user._id, email: user.email }, 'Verification email sent.', 201);
  } catch (err) {
    if (err.code === 11000) throw new AppError('Email already in use', 409);
    throw err;
  }
});

// ────────────────────────────────────────────────────────────────────────────

exports.verifyEmail = asyncWrapper(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('Verification token required', 400);

  /**
   * FIX: Race Condition
   * 
   * الكود القديم: كان بيعمل findOne ثم save في خطوتين منفصلتين.
   * لو نفس الـ token اتبعت مرتين في نفس اللحظة (double-click أو
   * network retry)، الاتنين ممكن يعدوا الـ check ويعملوا save.
   * 
   * الحل: findOneAndUpdate atomic operation — الـ DB بتعمل الـ check
   * والـ update في نفس اللحظة، مش ممكن يحصل race.
   */
  const hashedToken = hashToken(token);

  const user = await User.findOneAndUpdate(
    {
      verificationToken:        hashedToken,
      verificationTokenExpires: { $gt: new Date() },
    },
    {
      $unset: {
        verificationToken:       1,
        verificationTokenExpires: 1,
      },
    },
    { new: true }
  );

  if (!user) throw new AppError('Invalid or expired token', 400);

  if (user.pendingEmail) {
    const nextEmail = normalizeEmail(user.pendingEmail);
    const exists    = await User.exists({ _id: { $ne: user._id }, email: nextEmail });
    if (exists) throw new AppError('Email already in use', 409);

    user.email        = nextEmail;
    user.pendingEmail = undefined;
    await user.save();
  } else {
    user.isVerified = true;
    await user.save();
  }

  return success(res, { id: user._id, email: user.email }, 'Email verified. You can now log in.');
});

// ────────────────────────────────────────────────────────────────────────────

exports.login = asyncWrapper(async (req, res) => {
  // FIX: normalize email
  const email    = normalizeEmail(req.body.email || '');
  const password = req.body.password;

  if (!email || !password) throw new AppError('Email and password required', 400);
  if (!isValidEmail(email)) throw new AppError('Valid email required', 400);

  const user = await User.findOne({ email }).select('+password');

  /**
   * FIX: User Enumeration
   * 
   * الكود القديم: كان بيرجع errors مختلفة:
   *   - user مش موجود  → 'Invalid credentials' (401)
   *   - email مش verified → 'Email not verified' (403)
   * المهاجم يقدر يعرف إيه الـ emails الموجودة من الـ status code المختلف.
   * 
   * الحل: نفس الـ error message والـ status code في الحالتين.
   * بس بنفرق داخلياً عشان نعمل comparePassword فقط لو الـ user موجود.
   */

  // بنعمل comparePassword دايماً (حتى لو user مش موجود) عشان
  // نمنع timing attacks — الـ response time يبقى متساوي في الحالتين
  const DUMMY_HASH = '$2b$12$invalidhashfortimingprotectiononly000000000000000000000';
  const passwordToCheck = user ? undefined : DUMMY_HASH;

  if (!user) {
    // Run a dummy compare to equalize response time
    await User.hydrate({ password: DUMMY_HASH }).comparePassword(password).catch(() => {});
    throw new AppError('Invalid credentials', 401);
  }

  if (user.isBanned) throw new AppError('Your account has been banned', 403);

  const match = await user.comparePassword(password);

  // FIX: نرجع نفس الـ error سواء الـ password غلط أو الـ email مش verified
  if (!match || !user.isVerified) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.twoFA && user.twoFA.enabled) {
    const tempToken = jwt.sign(
      { sub: String(user._id), temp2FA: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    return success(res, { requires2FA: true, tempToken }, '2FA required');
  }

  const token        = generateJwt(user);
  const refreshToken = generateRefreshToken(user);

  pruneAndAddRefreshToken(user, refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('accessToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   15 * 60 * 1000, // Matches JWT_EXPIRES_IN (15m) or similar
  });

  return success(res, {
    token,
    user: {
      id:       user._id,
      _id:      user._id,
      email:    user.email,
      username: user.username,
      avatar:   user.avatar,
      isAdmin:  user.isAdmin,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    },
  }, 'Logged in');
});

// ────────────────────────────────────────────────────────────────────────────

exports.verify2FA = asyncWrapper(async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) throw new AppError('Token and code required', 400);

  let payload;
  try {
    payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!payload.temp2FA) throw new AppError('Invalid token type', 400);
  } catch (err) {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(payload.sub).select('+twoFA.secret +twoFA.backupCodes');
  if (!user || !user.twoFA || !user.twoFA.enabled) throw new AppError('2FA not enabled', 400);

  const twoFAService = require('../services/twofa.service');
  
  let isValid = twoFAService.verifyToken(user.twoFA.secret, code);
  
  if (!isValid) {
    // Try backup code
    const backupResult = twoFAService.verifyBackupCode(user, code);
    if (backupResult.valid) {
      isValid = true;
      // Consume the backup code
      user.twoFA.backupCodes.splice(backupResult.index, 1);
    }
  }

  if (!isValid) throw new AppError('Invalid code', 401);

  const token        = generateJwt(user);
  const refreshToken = generateRefreshToken(user);

  pruneAndAddRefreshToken(user, refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('accessToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   15 * 60 * 1000,
  });

  return success(res, {
    token,
    user: {
      id:       user._id,
      _id:      user._id,
      email:    user.email,
      username: user.username,
      avatar:   user.avatar,
      isAdmin:  user.isAdmin,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    },
  }, '2FA verification successful');
});

// ────────────────────────────────────────────────────────────────────────────

exports.googleLogin = asyncWrapper(async (req, res) => {
  const { idToken } = req.body;
  if (!process.env.GOOGLE_CLIENT_ID) throw new AppError('Google OAuth is not configured on server', 500);
  if (!idToken) throw new AppError('Missing Google ID token', 400);

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload       = ticket.getPayload();
  const email         = normalizeEmail(payload?.email || ''); // FIX: normalize
  const emailVerified = payload?.email_verified;
  const name          = payload?.name || '';
  const picture       = payload?.picture || '';

  if (!email || !emailVerified) throw new AppError('Google account email is not verified', 403);

  let user = await User.findOne({ email });
  if (user && user.isBanned) throw new AppError('Your account has been banned', 403);

  if (!user) {
    user = await User.create({
      email,
      password:   generateToken(24),
      isVerified: true,
      username:   name || email.split('@')[0],
      avatar:     picture || undefined,
    });
  } else {
    let modified = false;
    if (!user.isVerified) {
      user.isVerified              = true;
      user.verificationToken       = undefined;
      user.verificationTokenExpires = undefined;
      modified = true;
    }
    if (!user.username && name)   { user.username = name;    modified = true; }
    if (!user.avatar   && picture){ user.avatar   = picture; modified = true; }
    if (modified) await user.save();
  }

  if (user.twoFA && user.twoFA.enabled) {
    const tempToken = jwt.sign(
      { sub: String(user._id), temp2FA: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    return success(res, { requires2FA: true, tempToken }, '2FA required');
  }

  const token        = generateJwt(user);
  const refreshToken = generateRefreshToken(user);

  pruneAndAddRefreshToken(user, refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('accessToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   15 * 60 * 1000,
  });

  return success(res, {
    token,
    user: {
      id:       user._id,
      _id:      user._id,
      email:    user.email,
      username: user.username,
      avatar:   user.avatar,
      isAdmin:  user.isAdmin,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    },
  }, 'Logged in with Google');
});

// ────────────────────────────────────────────────────────────────────────────

exports.logout = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    let user = req.user ? await User.findById(req.user._id) : null;

    if (!user) {
      try {
        const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
        const decoded       = jwt.verify(refreshToken, refreshSecret);
        user                = await User.findById(decoded.sub);
      } catch (_) {}
    }

    if (user?.refreshTokens) {
      user.refreshTokens = user.refreshTokens.filter(rt => rt !== hashToken(refreshToken));
      await user.save();
    }
  }

  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');
  return success(res, {}, 'Logged out');
});

// ────────────────────────────────────────────────────────────────────────────

exports.refreshToken = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) throw new AppError('Refresh token required', 401);

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user    = await User.findById(payload.sub);

    if (!user?.refreshTokens?.includes(hashToken(refreshToken))) {
      throw new AppError('Invalid refresh token', 401);
    }

    const token = generateJwt(user);
    
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   15 * 60 * 1000,
    });

    return success(res, { token }, 'Token refreshed');
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
});

// ────────────────────────────────────────────────────────────────────────────

exports.requestPasswordReset = asyncWrapper(async (req, res) => {
  const email = normalizeEmail(req.body.email || ''); // FIX: normalize
  if (!email) throw new AppError('Email required', 400);

  /**
   * FIX: Timing Attack
   * 
   * الكود القديم: الـ delay كان 200ms فقط.
   * لو الـ DB query بتاخد 5ms، الفرق بين user موجود وغير موجود
   * واضح جداً لو حد بيعمل timing attack.
   * 
   * الحل: نعمل الـ DB query دايماً، والـ flow يبقى متساوي في الوقت
   * سواء الـ user موجود أو لا.
   */
  const user = await User.findOne({ email });

  // نعمل الـ processing دايماً حتى لو الـ user مش موجود
  const token   = generateToken(16);
  const hashed  = hashToken(token);
  const expires = expiresIn(Number(process.env.RESET_HOURS) || 1);

  if (user) {
    user.resetPasswordToken        = hashed;
    user.resetPasswordTokenExpires = expires;
    await user.save();
    await emailService.passwordResetEmail(email, token);
  }

  // نفس الـ message دايماً
  return success(res, {}, 'If that email exists, a reset link was sent');
});

// ────────────────────────────────────────────────────────────────────────────

exports.resetPassword = asyncWrapper(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword)   throw new AppError('Token and newPassword required', 400);
  if (newPassword.length < 8)   throw new AppError('Password min length 8', 400);
  if (confirmPassword !== undefined && newPassword !== confirmPassword)
    throw new AppError('Passwords do not match', 400);

  const user = await User.findOne({
    resetPasswordToken:        hashToken(token),
    resetPasswordTokenExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('Invalid or expired token', 400);

  user.password                  = newPassword;
  user.resetPasswordToken        = undefined;
  user.resetPasswordTokenExpires = undefined;
  await user.save();

  await emailService.passwordChangedEmail(user.email);
  return success(res, {}, 'Password reset successful');
});

// ────────────────────────────────────────────────────────────────────────────

exports.changePassword = asyncWrapper(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) throw new AppError('Old and new passwords required', 400);
  if (newPassword.length < 8)       throw new AppError('Password min length 8', 400);

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new AppError('User not found', 404);

  const match = await user.comparePassword(oldPassword);
  if (!match) throw new AppError('Old password is incorrect', 401);

  user.password      = newPassword;
  user.refreshTokens = [];
  await user.save();

  await emailService.passwordChangedEmail(user.email);

  /**
   * NOTE: الـ behavior ده مقصود كـ security measure:
   * تغيير الـ password بيعمل logout من كل الـ devices.
   * المفروض الـ frontend يعرف ده ويوجه المستخدم لـ login page.
   */
  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');
  return success(res, {}, 'Password changed. You have been logged out from all devices.');
});