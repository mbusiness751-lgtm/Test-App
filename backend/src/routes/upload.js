/**
 * Upload speed test endpoint.
 *
 * POST /api/upload
 *
 * Receives binary payload, measures transfer, discards data.
 * Returns timing metadata for client-side Mbps calculation.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_SIZE || '52428800', 10); // 50 MB default

router.post('/', (req, res) => {
  const serverReceiveStart = Date.now();
  const hrStart = process.hrtime.bigint();

  res.setHeader('Cache-Control', 'no-store');

  let bytesReceived = 0;
  let firstByteTime = null;

  req.on('data', (chunk) => {
    if (firstByteTime === null) {
      firstByteTime = process.hrtime.bigint();
    }
    bytesReceived += chunk.length;

    // Safety: reject oversized uploads
    if (bytesReceived > MAX_UPLOAD_BYTES) {
      logger.warn('Upload size exceeded limit', { bytesReceived, MAX_UPLOAD_BYTES });
      res.status(413).json({ error: 'Payload too large' });
      req.destroy();
    }
  });

  req.on('end', () => {
    const hrEnd = process.hrtime.bigint();
    const totalMs = Number(hrEnd - hrStart) / 1e6;
    const transferMs = firstByteTime
      ? Number(hrEnd - firstByteTime) / 1e6
      : totalMs;

    logger.debug('Upload complete', {
      bytesReceived,
      totalMs: totalMs.toFixed(1),
      transferMs: transferMs.toFixed(1),
    });

    res.json({
      success: true,
      bytesReceived,
      totalMs,
      transferMs,
      serverReceiveStart,
      serverReceiveEnd: Date.now(),
      // Client uses these to validate its own measurement
      serverMbps: bytesReceived > 0 && transferMs > 0
        ? ((bytesReceived * 8) / transferMs / 1000).toFixed(2)
        : null,
    });
  });

  req.on('error', (err) => {
    logger.error('Upload stream error', { error: err.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Upload error' });
    }
  });
});

module.exports = router;
