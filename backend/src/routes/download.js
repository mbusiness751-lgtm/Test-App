/**
 * Download speed test endpoint.
 *
 * GET /api/download?size=md&streams=3
 *
 * Streams random binary data of requested size.
 * No compression so byte count is exact.
 * Cache-busting headers prevent any proxy caching.
 */

const express = require('express');
const router = express.Router();
const { streamBuffer, CHUNK_SIZES } = require('../utils/generateData');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  const sizeKey = req.query.size || 'md';
  const sizeBytes = CHUNK_SIZES[sizeKey] ?? CHUNK_SIZES.md;

  // Prevent any caching at every layer
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', sizeBytes);
  res.setHeader('X-Test-Size', sizeBytes);
  res.setHeader('X-Test-Timestamp', Date.now());

  const start = process.hrtime.bigint();
  let bytesSent = 0;

  // Drain detection — abort if client disconnects
  req.on('close', () => {
    if (!res.writableEnded) {
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
      logger.debug('Download stream aborted by client', {
        bytesSent,
        elapsedMs: elapsedMs.toFixed(1),
      });
    }
  });

  try {
    for (const chunk of streamBuffer(sizeBytes)) {
      if (!res.writable) break;
      res.write(chunk);
      bytesSent += chunk.length;
    }
    res.end();

    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.debug('Download complete', {
      sizeKey,
      sizeBytes,
      bytesSent,
      elapsedMs: elapsedMs.toFixed(1),
    });
  } catch (err) {
    logger.error('Download stream error', { error: err.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream error' });
    }
  }
});

// Endpoint to return available test sizes
router.get('/sizes', (req, res) => {
  res.json({
    sizes: Object.entries(CHUNK_SIZES).map(([key, bytes]) => ({
      key,
      bytes,
      label: bytes < 1_000_000
        ? `${bytes / 1000} KB`
        : `${bytes / 1_000_000} MB`,
    })),
  });
});

module.exports = router;
