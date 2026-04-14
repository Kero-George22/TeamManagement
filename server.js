require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const errorHandler = require('./middlewares/error.handler');

const app = express();

// ─────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS — في production استبدل * بـ domain بتاعك
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

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
app.use('/uploads',  express.static(path.join(__dirname, 'uploads')));

// ─────────────────────────────────────────
// Static files & legacy HTML pages
// ─────────────────────────────────────────

const reactBuildPath = path.join(__dirname, 'public', 'app');
const publicPath = path.join(__dirname, 'public');

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
  const index = path.join(reactBuildPath, 'index.html');
  require('fs').existsSync(index)
    ? res.sendFile(index)
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
  .then(() => {
    console.log('✓ Connected to MongoDB');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✓ Server listening on ${PORT}`));
  })
  .catch((err) => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;