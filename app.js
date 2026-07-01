const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/error.handler');
const { requireAuth } = require('./middlewares/auth.middleware');
const Task = require('./models/task.model');
const Project = require('./models/project.model');

const app = express();
const uploadsPath = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsPath, { recursive: true });

if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  throw new Error('CLIENT_URL env variable must be set in production');
}

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : true;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...(Array.isArray(allowedOrigins) ? allowedOrigins : []), 'https://accounts.google.com'],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
      fontSrc: ["'self'", 'data:', 'https://cdnjs.cloudflare.com'],
      frameSrc: ["'self'", 'https://accounts.google.com'],
    },
  },
}));

app.use(cookieParser());

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const apiRouter = express.Router();
apiRouter.use(globalLimiter);
apiRouter.use('/auth', require('./routers/auth.routes'));
apiRouter.use('/admin', require('./routers/admin.routes'));
apiRouter.use('/projects', require('./routers/project.routes'));
apiRouter.use('/tasks', require('./routers/task.routes'));
apiRouter.use('/profile', require('./routers/profile.routes'));
apiRouter.use('/office', require('./routers/office.routes'));
apiRouter.use('/dms', require('./routers/dm.routes'));
apiRouter.use('/time', require('./routers/time.routes'));
apiRouter.use('/notifications', require('./routers/notification.routes'));
apiRouter.use('/analytics', require('./routers/analytics.routes'));
apiRouter.use('/portfolio', require('./routers/portfolio.routes'));
apiRouter.use('/submissions', require('./routers/submission.routes'));
apiRouter.use('/goals', require('./routers/goal.routes'));
apiRouter.use('/ai', require('./routers/ai.routes'));
apiRouter.use('/team-features', require('./routers/teamFeature.routes'));

apiRouter.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    ok: true,
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1', apiRouter);



const reactBuildPath = path.join(__dirname, 'client', 'dist');
const reactIndexPath = path.join(reactBuildPath, 'index.html');
const hasReactIndex = fs.existsSync(reactIndexPath);

app.use(express.static(reactBuildPath));

app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api/v1')) {
    return res.status(404).json({ success: false, message: 'API Route Not Found' });
  }
  if (hasReactIndex) {
    return res.sendFile(reactIndexPath);
  }
  return res.status(404).send('React app not built yet. Run: cd client && npm run build');
});

app.use(errorHandler);

module.exports = app;
