// Global error handler
module.exports = (err, req, res, next) => {
  // Normalize
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const meta = {};
  if (process.env.NODE_ENV === 'development') {
    meta.stack = err.stack;
  }
  // Avoid using res if headers already sent
  if (res.headersSent) return next(err);
  return res.status(status).json({ success: false, message, meta });
};
