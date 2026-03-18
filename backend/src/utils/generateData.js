/**
 * Generates random binary data buffers for speed testing.
 * Uses crypto-quality randomness to prevent compression artifacts
 * that would skew download/upload measurements.
 */

const crypto = require('crypto');

// Predefined chunk sizes for progressive testing
const CHUNK_SIZES = {
  xs:   250_000,      // 250 KB  - initial calibration
  sm:   1_000_000,    // 1 MB
  md:   5_000_000,    // 5 MB
  lg:   10_000_000,   // 10 MB
  xl:   25_000_000,   // 25 MB
  xxl:  50_000_000,   // 50 MB  - high bandwidth connections
};

// Pre-generate a pool of random data to avoid re-allocation overhead
const DATA_POOL_SIZE = 1_000_000; // 1 MB pool
let dataPool = null;

function getDataPool() {
  if (!dataPool) {
    dataPool = crypto.randomBytes(DATA_POOL_SIZE);
  }
  return dataPool;
}

/**
 * Generate a buffer of the specified size.
 * Tiles the random pool rather than generating fresh bytes each call.
 */
function generateBuffer(sizeBytes) {
  const pool = getDataPool();
  const buf = Buffer.allocUnsafe(sizeBytes);
  let offset = 0;
  while (offset < sizeBytes) {
    const remaining = sizeBytes - offset;
    const copyLen = Math.min(remaining, DATA_POOL_SIZE);
    pool.copy(buf, offset, 0, copyLen);
    offset += copyLen;
  }
  return buf;
}

/**
 * Stream a chunk of random data.
 * Uses chunked streaming to avoid loading entire file into memory.
 */
function* streamBuffer(sizeBytes, streamChunkSize = 65536) {
  const pool = getDataPool();
  let remaining = sizeBytes;
  while (remaining > 0) {
    const chunkLen = Math.min(remaining, streamChunkSize);
    // Tile pool data
    const chunk = Buffer.allocUnsafe(chunkLen);
    const poolOffset = (sizeBytes - remaining) % DATA_POOL_SIZE;
    const available = DATA_POOL_SIZE - poolOffset;
    if (available >= chunkLen) {
      pool.copy(chunk, 0, poolOffset, poolOffset + chunkLen);
    } else {
      pool.copy(chunk, 0, poolOffset, DATA_POOL_SIZE);
      pool.copy(chunk, available, 0, chunkLen - available);
    }
    remaining -= chunkLen;
    yield chunk;
  }
}

module.exports = { generateBuffer, streamBuffer, CHUNK_SIZES };
