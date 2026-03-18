/**
 * Server information endpoint.
 * Returns metadata about the test server and optionally
 * performs a basic geolocation lookup on the client IP.
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Get real client IP (respects X-Forwarded-For from proxies/load balancers)
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    server: {
      location: process.env.SERVER_LOCATION || 'Auto',
      city: process.env.SERVER_CITY || 'Local',
      country: process.env.SERVER_COUNTRY || 'US',
      name: process.env.SERVER_NAME || 'SpeedTest Server',
      version: '1.0.0',
    },
    client: {
      ip: clientIp,
      // ISP data would come from a MaxMind or ipinfo.io integration in production
      isp: 'Unknown (add ipinfo.io key)',
    },
    timestamp: Date.now(),
  });
});

module.exports = router;
