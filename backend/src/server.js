/**
 * SpeedTest Backend Server
 * ========================
 * Production-grade Node.js + Express speed test API.
 *
 * Routes:
 *   GET  /api/download       - stream random data for download test
 *   POST /api/upload         - receive data for upload test
 *   GET  /api/ping           - single latency measurement
 *   GET  /api/ping/multi     - multi-sample latency + jitter
 *   GET  /api/info           - server & client metadata
 *   WS   /ws                 - WebSocket for live coordination
 */

require('dotenv').config();

const http    = require('http');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const compression = require('compression');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const downloadRoute = require('./routes/download');
const uploadRoute   = require('./routes/upload');
const pingRoute     = require('./routes/ping');
const infoRoute     = require('./routes/info');
const { setupWebSocket } = require('./ws/wsHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Test-Id', 'X-Requested-With'],
  exposedHeaders: ['X-Server-Time', 'X-Test-Size', 'X-Test-Timestamp', 'Content-Length'],
  maxAge: 86400,
}));

// ─── Compression (skip for download endpoint — data is already random/incompressible) ──
app.use((req, res, next) => {
  if (req.path.startsWith('/api/download')) return next();
  compression()(req, res, next);
});

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    // Skip health checks in logs
    skip: (req) => req.path === '/health',
  }));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait.' },
  skip: (req) => req.path === '/health',
});
app.use('/api', limiter);

// ─── Body parsing (upload uses raw stream, not body-parser) ───────────────────
app.use('/api/info', express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/download', downloadRoute);
app.use('/api/upload',   uploadRoute);
app.use('/api/ping',     pingRoute);
app.use('/api/info',     infoRoute);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── HTTP + WebSocket server ───────────────────────────────────────────────────
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`SpeedTest backend running`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
  });
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = { app, server };
