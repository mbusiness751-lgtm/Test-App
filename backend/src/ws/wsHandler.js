/**
 * WebSocket handler for real-time speed test coordination.
 *
 * Clients connect and receive live progress events.
 * The server pushes metrics back as tests proceed.
 *
 * Message protocol (JSON):
 *   Client → Server: { type: 'start', config: { ... } }
 *   Server → Client: { type: 'progress', phase, value, unit }
 *   Server → Client: { type: 'complete', results }
 *   Server → Client: { type: 'error', message }
 */

const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const HEARTBEAT_INTERVAL = 15_000; // 15 s

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const clientId = uuidv4().slice(0, 8);
    ws.clientId = clientId;
    ws.isAlive = true;

    logger.info('WS client connected', { clientId });

    // Send welcome / server info
    safeSend(ws, {
      type: 'connected',
      clientId,
      serverTime: Date.now(),
    });

    // Pong handler for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        safeSend(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }
      handleMessage(ws, msg);
    });

    ws.on('error', (err) => {
      logger.error('WS error', { clientId, error: err.message });
    });

    ws.on('close', () => {
      logger.info('WS client disconnected', { clientId });
    });
  });

  // Heartbeat — terminate dead connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        logger.debug('Terminating dead WS client', { clientId: ws.clientId });
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => clearInterval(heartbeat));

  logger.info('WebSocket server ready at /ws');
  return wss;
}

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      safeSend(ws, { type: 'pong', serverTime: Date.now() });
      break;

    case 'start':
      // Acknowledge; actual test phases are driven by HTTP fetch in the client.
      // WS is used for pushing server-side observations.
      safeSend(ws, {
        type: 'ack',
        message: 'Test acknowledged. Proceed with HTTP test phases.',
        serverTime: Date.now(),
      });
      break;

    case 'result':
      // Client reports final result; server could log/store it
      logger.info('Client test result received', {
        clientId: ws.clientId,
        download: msg.download,
        upload: msg.upload,
        ping: msg.ping,
      });
      safeSend(ws, { type: 'saved', success: true });
      break;

    default:
      safeSend(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
  }
}

function safeSend(ws, data) {
  try {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(data));
    }
  } catch (err) {
    logger.error('WS send error', { error: err.message });
  }
}

module.exports = { setupWebSocket };
