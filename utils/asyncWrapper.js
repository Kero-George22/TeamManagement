// Wrap async route handlers to forward errors to express error handler
module.exports = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(err => {
    console.error('🔥 Error:', err.message);
    console.error(err.stack); // اختياري: يطبع stack trace
    next(err);
  });
