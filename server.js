require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const pollRoutes = require('./routes/polls');
const hubRoutes = require('./routes/hub');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const { runEscalationJob } = require('./middleware/escalation');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/hub', hubRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'NeoConnect API running', timestamp: new Date().toISOString() });
});

// 7-day escalation cron — runs every day at 08:00
cron.schedule('0 8 * * *', () => {
  console.log('[CRON] Running escalation check...');
  runEscalationJob();
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[DB] MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`[SERVER] NeoConnect API on port ${PORT}`));
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
