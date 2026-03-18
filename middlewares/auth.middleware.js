const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TokenBlacklist = require('../models/tokenBlacklist.model');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // check blacklist
    const black = await TokenBlacklist.findOne({ token });
    if (black) return res.status(401).json({ message: 'Token revoked' });

    const user = await User.findById(payload.sub).select('-password');
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    User.updateOne({ _id: user._id }, { $set: { lastSeen: new Date() } }).catch(() => {});

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { requireAuth };
