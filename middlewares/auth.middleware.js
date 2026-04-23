const jwt  = require('jsonwebtoken');
const User = require('../models/user.model');

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-password').lean();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
module.exports = { requireAuth };
