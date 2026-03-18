/**
 * SpeedTest Engine
 * ================
 * Handles all measurement logic: download, upload, ping, jitter.
 *
 * Design principles:
 * - AbortController on every fetch for clean cancellation
 * - Progressive accuracy: run small → large chunks
 * - Parallel streams for realistic bandwidth saturation
 * - Cache busting via random query params
 * - Mbps = (bytes × 8) / seconds / 1,000,000
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cacheBust = () => `&_=${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Calculate Mbps from bytes and milliseconds.
 */
export const calcMbps = (bytes, ms) => {
  if (ms <= 0 || bytes <= 0) return 0;
  return (bytes * 8) / (ms / 1000) / 1_000_000;
};

/**
 * Median of an array of numbers.
 */
const median = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Weighted moving average — recent samples have higher weight.
 */
const weightedAvg = (samples) => {
  if (!samples.length) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  samples.forEach((v, i) => {
    const w = i + 1;
    weightedSum += v * w;
    totalWeight += w;
  });
  return weightedSum / totalWeight;
};

// ─── Ping ─────────────────────────────────────────────────────────────────────

/**
 * Measure round-trip latency using HEAD requests.
 * @param {AbortSignal} signal
 * @param {number} count - number of pings
 * @param {function} onSample - called with each sample (ms)
 * @returns {{ avg, min, max, jitter, samples }}
 */
export async function measurePing(signal, count = 12, onSample) {
  const samples = [];
  const url = `${API_BASE}/api/ping`;

  // Warm up connection (first request is slower due to TCP setup)
  try {
    await fetch(url, { method: 'HEAD', cache: 'no-store', signal });
  } catch (_) {}

  for (let i = 0; i < count; i++) {
    if (signal?.aborted) break;
    try {
      const t0 = performance.now();
      await fetch(`${url}?i=${i}${cacheBust()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal,
      });
      const rtt = performance.now() - t0;
      samples.push(rtt);
      onSample?.(rtt);
      // Small delay between pings
      await sleep(50);
    } catch (err) {
      if (err.name === 'AbortError') break;
    }
  }

  if (!samples.length) return { avg: 0, min: 0, max: 0, jitter: 0, samples: [] };

  const validSamples = samples.filter(s => s > 0);
  const avg = median(validSamples);
  const min = Math.min(...validSamples);
  const max = Math.max(...validSamples);

  // Jitter: mean absolute deviation of consecutive samples
  let jitterSum = 0;
  for (let i = 1; i < validSamples.length; i++) {
    jitterSum += Math.abs(validSamples[i] - validSamples[i - 1]);
  }
  const jitter = validSamples.length > 1 ? jitterSum / (validSamples.length - 1) : 0;

  return { avg, min, max, jitter, samples: validSamples };
}

// ─── Download ─────────────────────────────────────────────────────────────────

const DOWNLOAD_PHASES = [
  { size: 'xs', streams: 1 },   // calibration
  { size: 'sm', streams: 2 },   // ramp up
  { size: 'md', streams: 3 },   // primary measurement
  { size: 'lg', streams: 4 },   // saturation
];

/**
 * Download speed test.
 * Runs progressive phases to find true bandwidth.
 *
 * @param {AbortSignal} signal
 * @param {function} onProgress - called with current Mbps estimate
 * @returns {number} - final Mbps
 */
export async function measureDownload(signal, onProgress) {
  const speedSamples = [];
  let phaseCount = 0;

  for (const phase of DOWNLOAD_PHASES) {
    if (signal?.aborted) break;
    phaseCount++;

    try {
      const phaseMbps = await downloadPhase(phase.size, phase.streams, signal, (mbps) => {
        speedSamples.push(mbps);
        const current = weightedAvg(speedSamples.slice(-6));
        onProgress?.(current, phaseCount);
      });

      speedSamples.push(phaseMbps);
      onProgress?.(weightedAvg(speedSamples.slice(-4)), phaseCount);

      // Early exit: if calibration is very slow, skip large tests
      if (phaseCount === 1 && phaseMbps < 1) {
        break;
      }
    } catch (err) {
      if (err.name === 'AbortError') break;
      console.error(`Download phase ${phaseCount} failed:`, err.message);
      // Continue to next phase if one fails
    }
  }

  if (!speedSamples.length) {
    throw new Error('Download test failed to get any measurements');
  }

  return speedSamples.length ? weightedAvg(speedSamples.slice(-4)) : 0;
}

async function downloadPhase(sizeKey, streams, signal, onProgress) {
  const url = (i) =>
    `${API_BASE}/api/download?size=${sizeKey}&stream=${i}${cacheBust()}`;

  const start = performance.now();
  let totalBytes = 0;
  let lastReport = start;

  const streamTasks = Array.from({ length: streams }, async (_, i) => {
    const res = await fetch(url(i), {
      cache: 'no-store',
      signal,
      headers: { 'Accept': 'application/octet-stream' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    let streamBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done || signal?.aborted) break;

      if (!value) continue;
      totalBytes += value.byteLength;
      streamBytes += value.byteLength;

      const now = performance.now();
      if (now - lastReport > 100) {
        const elapsed = (now - start) / 1000;
        const mbps = calcMbps(totalBytes, now - start);
        onProgress?.(mbps);
        lastReport = now;
      }
    }
    return streamBytes;
  });

  const results = await Promise.allSettled(streamTasks);

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  if (successCount === 0) {
    throw new Error('All download streams failed');
  }

  const elapsed = performance.now() - start;
  return calcMbps(totalBytes, elapsed);
}

// ─── Upload ───────────────────────────────────────────────────────────────────

const UPLOAD_PHASES = [
  { sizeMb: 0.5,  streams: 1 },
  { sizeMb: 2,    streams: 2 },
  { sizeMb: 5,    streams: 3 },
  { sizeMb: 10,   streams: 4 },
];

/**
 * Upload speed test.
 * Generates blobs of increasing size and POSTs them.
 *
 * @param {AbortSignal} signal
 * @param {function} onProgress - called with current Mbps estimate
 * @returns {number} - final Mbps
 */
export async function measureUpload(signal, onProgress) {
  const speedSamples = [];
  let phaseCount = 0;

  for (const phase of UPLOAD_PHASES) {
    if (signal?.aborted) break;
    phaseCount++;

    try {
      const phaseMbps = await uploadPhase(phase.sizeMb, phase.streams, signal, (mbps) => {
        speedSamples.push(mbps);
        onProgress?.(weightedAvg(speedSamples.slice(-6)), phaseCount);
      });

      speedSamples.push(phaseMbps);
      onProgress?.(weightedAvg(speedSamples.slice(-4)), phaseCount);

      if (phaseCount === 1 && phaseMbps < 0.5) break;
    } catch (err) {
      if (err.name === 'AbortError') break;
    }
  }

  return speedSamples.length ? weightedAvg(speedSamples.slice(-4)) : 0;
}

async function uploadPhase(sizeMb, streams, signal, onProgress) {
  const sizeBytes = Math.round(sizeMb * 1_000_000);
  const url = `${API_BASE}/api/upload?${cacheBust()}`;

  const start = performance.now();
  let totalBytes = 0;

  // Generate random blob once per phase, share across streams
  const blob = generateRandomBlob(sizeBytes);

  const streamTasks = Array.from({ length: streams }, async () => {
    const streamStart = performance.now();

    await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      signal,
      headers: { 'Content-Type': 'application/octet-stream' },
      body: blob,
      // duplex needed for streaming uploads in modern browsers
      duplex: 'half',
    });

    const elapsed = performance.now() - streamStart;
    totalBytes += sizeBytes;

    const mbps = calcMbps(sizeBytes, elapsed);
    onProgress?.(mbps);
    return mbps;
  });

  const results = await Promise.allSettled(streamTasks);
  const elapsed = performance.now() - start;

  const validMbps = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  return validMbps.length ? weightedAvg(validMbps) : calcMbps(totalBytes, elapsed);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateRandomBlob(bytes) {
  const buffer = new Uint8Array(bytes);
  // Fill with pseudo-random data (faster than crypto for upload test)
  for (let i = 0; i < bytes; i += 4) {
    const r = Math.random() * 0xffffffff;
    buffer[i]     = r & 0xff;
    buffer[i + 1] = (r >> 8)  & 0xff;
    buffer[i + 2] = (r >> 16) & 0xff;
    buffer[i + 3] = (r >> 24) & 0xff;
  }
  return new Blob([buffer], { type: 'application/octet-stream' });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { sleep };
