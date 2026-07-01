const jwt = require('jsonwebtoken');
const User = require('../../models/user.model');

function accessTokenFor(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function authCookieFor(user) {
  return [`accessToken=${accessTokenFor(user)}`];
}

async function createUser(overrides = {}) {
  return User.create({
    email: overrides.email || `user-${Date.now()}-${Math.random()}@example.com`,
    password: overrides.password || 'Password123!',
    isVerified: overrides.isVerified ?? true,
    isAdmin: overrides.isAdmin || false,
    username: overrides.username || 'Test User',
    plan: overrides.plan || 'free',
    aiUsage: overrides.aiUsage,
  });
}

module.exports = {
  accessTokenFor,
  authCookieFor,
  createUser,
};
