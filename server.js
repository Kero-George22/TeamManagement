require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Serve static frontend files (legacy)
app.use(express.static(path.join(__dirname, 'public')));

// Serve React app build (production)
const reactBuildPath = path.join(__dirname, 'public', 'app');
app.use('/app', express.static(reactBuildPath));
app.get('/app/*path', (req, res) => {
    const index = path.join(reactBuildPath, 'index.html');
    const fs = require('fs');
    if (fs.existsSync(index)) {
        res.sendFile(index);
    } else {
        res.redirect('/');
    }
});
const authRoutes = require('./routers/auth.routes');
const projectRoutes = require('./routers/project.routes');
const taskRoutes = require('./routers/task.routes');
const setupRoutes = require('./routers/setup.routes');
const profileRoutes = require('./routers/profile.routes');
const submissionRoutes = require('./routers/submission.routes');
const analyticsRoutes = require('./routers/analytics.routes');
const assessmentRoutes = require('./routers/assessment.routes');
const portfolioRoutes = require('./routers/portfolio.routes');
const officeRoutes = require('./routers/office.routes');
const errorHandler = require('./middlewares/error.handler');

// CORS Configuration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobxp';
mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
})
    .then(async () => {
        console.log('✓ Connected to MongoDB');

        // Init Cron Jobs
        const cronService = require('./services/cron.service');
        cronService.initCronJobs();

        // Init Default Skills
        const skillService = require('./services/skill.service');
        await skillService.initDefaultSkills();
    })
    .catch(err => console.error('✗ MongoDB error:', err.message));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/setup', setupRoutes);
app.use('/profile', profileRoutes);
app.use('/submissions', submissionRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/assessments', assessmentRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/office', officeRoutes);
app.use('/submissions', submissionRoutes);
app.use('/analytics', analyticsRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

module.exports = app;