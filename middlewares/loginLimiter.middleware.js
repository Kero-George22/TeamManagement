// Simple in-memory rate limiter for login attempts
// Note: For production, replace with Redis-backed limiter or use `express-rate-limit`.
const attempts = new Map();

const WINDOW_MS =  15 //* 60 * 1000; // 15 minutes
const MAX_ATTEMPTS =  200;

function cleanup() {
  const now = Date.now();
  for (const [key, val] of attempts.entries()) {
    if (val.expires < now) attempts.delete(key);
  }
}

setInterval(cleanup, 60 * 1000).unref();

module.exports = (req, res, next) => {
  const key = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  const entry = attempts.get(key) || { count: 0, expires: Date.now() + WINDOW_MS };
  if (Date.now() > entry.expires) {
    entry.count = 0;
    entry.expires = Date.now() + WINDOW_MS;
  }
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).json({ success: false, message: 'Too many login attempts. Try again later.' });
  }
  next();
};
