require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const adminRoutes = require('./routes/admin');
const storeRoutes = require('./routes/store');
const resellerRoutes = require('./routes/reseller');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/v1', resellerRoutes);

// Global error handler (must be last)
app.use(errorHandler);

// Start
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
};

start();

module.exports = app;
