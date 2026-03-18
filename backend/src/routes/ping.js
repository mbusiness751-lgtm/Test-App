/**
 * Ping / latency endpoint.
 *
 * GET /api/ping          - single ping
 * GET /api/ping/multi    - run N pings, return stats (avg, min, max, jitter)
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Single ping — returns server timestamp for RTT calculation on client
router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.setHeader('X-Server-Time', Date.now());
  res.status(200).json({
    pong: true,
    serverTime: Date.now(),
  });
});

// HEAD ping — minimal response body, pure latency measurement
router.head('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Server-Time', Date.now());
  res.status(200).end();
});

// Multi-ping statistics endpoint
// The client should prefer running pings itself; this is a server-side helper
router.get('/multi', async (req, res) => {
  const count = Math.min(parseInt(req.query.count || '10', 10), 20);
  const delayMs = parseInt(req.query.delay || '50', 10);

  const samples = [];
  const serverStart = Date.now();

  // We don't actually ping from server; we return sequential timestamps
  // so the client can measure round trips against them.
  for (let i = 0; i < count; i++) {
    samples.push({ seq: i, serverTime: Date.now() });
    if (i < count - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const durations = samples.map((s, i) =>
    i === 0 ? 0 : s.serverTime - samples[i - 1].serverTime
  ).filter(d => d > 0);

  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const min = durations.length ? Math.min(...durations) : 0;
  const max = durations.length ? Math.max(...durations) : 0;

  logger.debug('Multi-ping complete', { count, avg: avg.toFixed(1) });

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    count,
    samples,
    stats: {
      avgMs: parseFloat(avg.toFixed(2)),
      minMs: min,
      maxMs: max,
      jitterMs: parseFloat((max - min).toFixed(2)),
    },
    serverStart,
    serverEnd: Date.now(),
  });
});

module.exports = router;
