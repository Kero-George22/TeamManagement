const winston = require('winston');
const path = require('path');

// Configure log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  // Winston uses levels ranked by importance:
  // error > warn > info > http > verbose > debug > silly
  // Setting level: 'info' means "log info and everything more severe
  // (error, warn, info), ignore anything below that (debug)".
  // In production you don't want to drown in debug noise, but in
  // development you want to see everything - hence the difference here.
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'syncup-api' },
  transports: [
    // A transport is the destination of a log (where it gets written).
    // We have two file destinations here:

    // (1) error.log: errors only (level: 'error')
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' }),

    // (2) combined.log: everything (no level specified, so it takes
    // everything above the base logger level set above)
    // Practical benefit: if the server hits a problem, instead of
    // digging through one giant file with all logs mixed in, you open
    // error.log directly and find just the serious issues.
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: path.join(__dirname, '../logs/combined.log') }),
  ],
});

// If we're not in production then log to the `console` with the format:
// In development it also prints to the terminal (with colors, so it's
// easy to read while you're working).
// In production there's no need to print to console since usually
// nobody is watching the terminal live - log files or an external
// monitoring service (like Datadog/Sentry) handle that instead.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Important note to keep in mind when deploying:
// These log files are written to the server's local disk.
// If you're deploying on a platform like Render / Railway / Vercel
// with an ephemeral filesystem, these files get wiped every time you
// redeploy or the container restarts.
// If the server runs on a traditional VPS that persists disk storage,
// you're fine. Otherwise, you'll need to ship logs to an external
// service instead of relying on local files.
module.exports = logger;