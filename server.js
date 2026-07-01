require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./app');
const { setupSocket } = require('./services/socket.service');
const { initCronJobs } = require('./services/cron.service');

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL', 'GMAIL_USER', 'GMAIL_PASS', 'GOOGLE_CLIENT_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) throw new Error(`Missing required env var: ${envVar}`);
}

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : true;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocket(io);

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  })
  .then(() => {
    try {
      initCronJobs();
    } catch (err) {
      console.warn('Init skipped:', err.message);
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = server;
