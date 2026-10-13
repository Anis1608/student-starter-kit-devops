const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection state tracker
let dbStatus = 'Not Connected';

if (MONGO_URI && !MONGO_URI.includes('CHANGE_ME')) {
  console.log('Connecting to MongoDB...');
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      dbStatus = 'Connected to MongoDB';
      console.log('✅ MongoDB connected successfully!');
    })
    .catch((err) => {
      dbStatus = `MongoDB Error: ${err.message}`;
      console.warn('⚠️ MongoDB connection error (app is still running):', err.message);
    });
} else {
  console.log('ℹ️ No valid MONGO_URI supplied; skipping MongoDB auto-connection.');
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK ENDPOINTS
// Required by Kubernetes Liveness & Readiness Probes and Nginx Ingress
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: NODE_ENV,
    uptime: `${Math.floor(process.uptime())}s`,
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/info', (req, res) => {
  res.status(200).json({
    name: 'Skilli Student Fullstack API',
    version: '1.0.0',
    serverTime: new Date().toISOString(),
    status: 'operational',
    database: dbStatus
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Backend API is running! Visit /api/health or /health for status.');
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server listening on port ${PORT} [${NODE_ENV}]`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
  console.log(`👉 API check   : http://localhost:${PORT}/api/health`);
});
