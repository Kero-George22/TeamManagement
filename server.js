require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const errorHandler = require('./middlewares/error.handler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// ─────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────

app.use(helmet());

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

app.use('/auth',     require('./routers/auth.routes'));
app.use('/projects', require('./routers/project.routes'));
app.use('/tasks',    require('./routers/task.routes'));
app.use('/profile',  require('./routers/profile.routes'));
app.use('/office',   require('./routers/office.routes'));
app.use('/dms',      require('./routers/dm.routes'));
app.use('/posts',    require('./routers/post.routes'));
app.use('/time',     require('./routers/time.routes'));
app.use('/notifications', require('./routers/notification.routes'));
app.use('/analytics',   require('./routers/analytics.routes'));
app.use('/portfolio',   require('./routers/portfolio.routes'));
app.use('/submissions', require('./routers/submission.routes'));
app.use('/goals',       require('./routers/goal.routes'));
app.use('/uploads',  express.static(path.join(__dirname, 'uploads')));

// ─────────────────────────────────────────
// WebSocket (Socket.io)
// ─────────────────────────────────────────

const { setupSocket } = require('./services/socket.service');
setupSocket(io);

// ─────────────────────────────────────────
// Static files & legacy HTML pages
// ─────────────────────────────────────────

const reactBuildPath = path.join(__dirname, 'public', 'app');
const publicPath = path.join(__dirname, 'public');
const reactIndexPath = path.join(reactBuildPath, 'index.html');
const hasReactIndex = require('fs').existsSync(reactIndexPath);

app.use(express.static(publicPath));
app.use('/app', express.static(reactBuildPath));
const sendPage = (page) => (req, res) => res.sendFile(path.join(publicPath, page));

app.get('/',                   sendPage('index.html'));
app.get('/dashboard',          sendPage('dashboard.html'));
app.get('/pages/projects',     sendPage('projects.html'));
app.get('/project',            sendPage('project.html'));
app.get('/messages',           sendPage('messages.html'));
app.get('/profile-page',       sendPage('profile.html'));
app.get('/office',             sendPage('office.html'));
app.get('/task',               sendPage('task.html'));
app.get('/forgot-password',    sendPage('forgot-password.html'));

app.get('/app/*path', (req, res) => {
  hasReactIndex
    ? res.sendFile(reactIndexPath)
    : res.status(404).send('React app not built yet. Run: cd client && npm run build');
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));

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