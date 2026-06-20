const jwt  = require('jsonwebtoken');
const User = require('../models/user.model');

async function requireAuth(req, res, next) {
  let token = req.cookies?.accessToken;
  const auth = req.headers.authorization;
  if (!token && auth?.startsWith('Bearer ')) {
    token = auth.slice(7);
  }

  if (!token)
    return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.sub).select('-password').lean();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
    if (user.isBanned) return res.status(403).json({ success: false, message: 'Your account has been banned' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
module.exports = { requireAuth };
