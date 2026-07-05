// Global error handler
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  // If the response has already started being sent (headers already sent)
  // before this error occurred (e.g. mid-way through streaming or after
  // res.write() ran), you can't call res.status().json() again - Express
  // will throw "Cannot set headers after they are sent".
  // So we delegate to Express's default error handler via next(err).
  if (res.headersSent) return next(err);

  // Multer errors (file upload)
  // This is a special code Multer returns when the uploaded file
  // exceeds the allowed size limit.
  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn(`File too large error: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    // 413 = Payload Too Large, the correct status code for this case
    return res.status(413).json({ success: false, message: 'File too large. Max 5MB.' });
  }

  // Note: we're relying on .includes('File type') here, meaning we're
  // searching inside the message text itself. This is fragile - if
  // someone changes the message text elsewhere (e.g. in the multer
  // fileFilter) from "File type not allowed" to something else, this
  // condition silently stops working with no warning.
  // Better long-term approach: create a custom error class with
  // err.code = 'INVALID_FILE_TYPE' and check the code instead of the
  // text, so it can't break by accident.
  if (err.message?.includes('File type')) {
    logger.warn(`Invalid file type error: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    // 415 = Unsupported Media Type
    return res.status(415).json({ success: false, message: err.message });
  }

  // Smart fallback: any plain error (throw new Error('...')) without a
  // status gets treated as 500 automatically. If you're throwing custom
  // errors with err.status = 404 set on them, that gets respected here
  // instead of falling back to the default 500.
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Important logical distinction between two kinds of problems:
  // - 5xx = something broke on the server itself (bug, database down...)
  //   → deserves 'error' level and needs immediate attention, since it's
  //   not supposed to happen in the first place
  // - 4xx = a mistake from the client/user (bad input, not authenticated)
  //   → this happens normally every day, so it's just logged as 'warn'
  if (status >= 500) {
    logger.error(`${status} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, { error: err });
  } else {
    logger.warn(`${status} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  // Important security point: the stack trace (which shows exactly
  // which file and line the error happened in) is only sent to the
  // client in development.
  // In production, leaking it could expose details about the server's
  // internal structure (file names, libraries, versions) that could
  // help someone attempting an exploit.
  // The logger still writes the full stack to the log files
  // ({ error: err } above) so you can see it, but the end user should
  // never see it in production.
  const meta = {};
  if (process.env.NODE_ENV === 'development') {
    meta.stack = err.stack;
  }

  return res.status(status).json({ success: false, message, meta });
};