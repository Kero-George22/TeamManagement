// Global error handler
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn(`File too large error: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    return res.status(413).json({ success: false, message: 'File too large. Max 5MB.' });
  }
  if (err.message?.includes('File type')) {
    logger.warn(`Invalid file type error: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    return res.status(415).json({ success: false, message: err.message });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  if (status >= 500) {
    logger.error(`${status} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, { error: err });
  } else {
    logger.warn(`${status} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  const meta = {};
  if (process.env.NODE_ENV === 'development') {
    meta.stack = err.stack;
  }
  return res.status(status).json({ success: false, message, meta });
};
