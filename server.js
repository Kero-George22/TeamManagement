require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const errorHandler = require('./middlewares/error.handler');
const { requireAuth } = require('./middlewares/auth.middleware');
const Task = require('./models/task.model');
const Project = require('./models/project.model');

const app = express();
const server = http.createServer(app);
const uploadsPath = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsPath, { recursive: true });
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// ─────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.CLIENT_URL || '*'],
      imgSrc: ["'self'", "data:", "res.cloudinary.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// ─────────────────────────────────────────
// CORS — must come before routes
// ─────────────────────────────────────────

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : true; // true = allow all in dev

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─────────────────────────────────────────
// Body parsers
// ─────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─────────────────────────────────────────
// API Routes — MUST be before static pages!
// ─────────────────────────────────────────

const apiRouter = express.Router();
apiRouter.use('/auth',     require('./routers/auth.routes'));
apiRouter.use('/admin',    require('./routers/admin.routes'));
apiRouter.use('/projects', require('./routers/project.routes'));
apiRouter.use('/tasks',    require('./routers/task.routes'));
apiRouter.use('/profile',  require('./routers/profile.routes'));
apiRouter.use('/office',   require('./routers/office.routes'));
apiRouter.use('/dms',      require('./routers/dm.routes'));
apiRouter.use('/posts',    require('./routers/post.routes'));
apiRouter.use('/time',     require('./routers/time.routes'));
apiRouter.use('/notifications', require('./routers/notification.routes'));
apiRouter.use('/analytics',   require('./routers/analytics.routes'));
apiRouter.use('/portfolio',   require('./routers/portfolio.routes'));
apiRouter.use('/submissions', require('./routers/submission.routes'));
apiRouter.use('/goals',       require('./routers/goal.routes'));
apiRouter.use('/ai',          require('./routers/ai.routes'));

// Health check
apiRouter.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    ok: true,
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1', apiRouter);
app.get('/uploads/:filename', requireAuth, async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const attachment = `/uploads/${filename}`;
    const task = await Task.findOne({ attachment }).select('project assignedTo').lean();
    if (!task) return res.status(404).json({ success: false, message: 'File not found' });

    const project = await Project.findById(task.project).select('owner members').lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const uid = String(req.user._id);
    const canAccess =
      req.user.isAdmin ||
      String(project.owner) === uid ||
      String(task.assignedTo || '') === uid ||
      (project.members || []).some((m) => String(m.userId) === uid);

    if (!canAccess) return res.status(403).json({ success: false, message: 'Forbidden' });
    return res.sendFile(path.join(uploadsPath, filename));
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────
// WebSocket (Socket.io)
// ─────────────────────────────────────────

const { setupSocket } = require('./services/socket.service');
setupSocket(io);

// ─────────────────────────────────────────
// Static files (React SPA)
// ─────────────────────────────────────────

const reactBuildPath = path.join(__dirname, 'client', 'dist');
const reactIndexPath = path.join(reactBuildPath, 'index.html');
const hasReactIndex = fs.existsSync(reactIndexPath);

app.use(express.static(reactBuildPath));

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/v1')) {
    return res.status(404).json({ success: false, message: 'API Route Not Found' });
  }
  if (hasReactIndex) {
    res.sendFile(reactIndexPath);
  } else {
    res.status(404).send('React app not built yet. Run: cd client && npm run build');
  }
});

// ─────────────────────────────────────────
// Error handler — لازم يكون آخر حاجة
// ─────────────────────────────────────────

app.use(errorHandler);

// ─────────────────────────────────────────
// Database + Server
// ─────────────────────────────────────────

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error('MONGODB_URI env variable is not set');

mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS:          30000,
    connectTimeoutMS:         30000,
  })
  .then(async () => {
    console.log('✓ Connected to MongoDB');

    try {
      // Skills initialization removed
    } catch (err) {
      console.warn('Init skipped:', err.message);
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => console.log(`✓ Server listening on ${PORT}`));
  })
  .catch((err) => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
