/**
 * Minimal structured logger with level filtering.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'] ?? 2;

const timestamp = () => new Date().toISOString();

const log = (level, message, meta = {}) => {
  if (LEVELS[level] > currentLevel) return;
  const entry = {
    ts: timestamp(),
    level,
    message,
    ...(Object.keys(meta).length ? { meta } : {}),
  };
  const out = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(out + '\n');
  else process.stdout.write(out + '\n');
};

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  info:  (msg, meta) => log('info',  msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
