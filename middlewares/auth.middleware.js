const jwt  = require('jsonwebtoken');
const User = require('../models/user.model');
const TokenBlacklist = require('../models/tokenBlacklist.model');

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const blacklisted = await TokenBlacklist.findOne({ token }).lean();
    if (blacklisted)
      return res.status(401).json({ success: false, message: 'Token has been invalidated' });

    const user = await User.findById(payload.sub).select('-password').lean();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
module.exports = { requireAuth };
