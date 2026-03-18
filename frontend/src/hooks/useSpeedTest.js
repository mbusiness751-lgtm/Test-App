/**
 * useSpeedTest — orchestrates the full test sequence.
 *
 * State machine: idle → ping → download → upload → done | error
 */

import { useState, useRef, useCallback } from 'react';
import { measurePing, measureDownload, measureUpload } from '../utils/speedTest';

export const PHASES = {
  IDLE:     'idle',
  PING:     'ping',
  DOWNLOAD: 'download',
  UPLOAD:   'upload',
  DONE:     'done',
  ERROR:    'error',
};

const initialResults = {
  ping:     null,
  jitter:   null,
  download: null,
  upload:   null,
};

export function useSpeedTest() {
  const [phase, setPhase]         = useState(PHASES.IDLE);
  const [liveValue, setLiveValue] = useState(0);       // current animated value
  const [results, setResults]     = useState(initialResults);
  const [history, setHistory]     = useState([]);       // [{time, mbps}] for graph
  const [error, setError]         = useState(null);
  const [serverInfo, setServerInfo] = useState(null);

  const abortRef = useRef(null);
  const historyRef = useRef([]);

  const addHistory = useCallback((mbps) => {
    const point = { time: Date.now(), mbps };
    historyRef.current = [...historyRef.current.slice(-60), point];
    setHistory([...historyRef.current]);
  }, []);

  const fetchServerInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/info', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setServerInfo(data);
      }
    } catch (_) {}
  }, []);

  const start = useCallback(async () => {
    // Cancel any in-progress test
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    setPhase(PHASES.IDLE);
    setResults(initialResults);
    setLiveValue(0);
    setError(null);
    historyRef.current = [];
    setHistory([]);

    await fetchServerInfo();

    try {
      // ── Phase 1: Ping ──────────────────────────────────────────────────────
      setPhase(PHASES.PING);
      setLiveValue(0);

      const pingResult = await measurePing(signal, 12, (sample) => {
        setLiveValue(parseFloat(sample.toFixed(1)));
        addHistory(sample);
      });

      if (signal.aborted) return;

      setResults(prev => ({
        ...prev,
        ping:   parseFloat(pingResult.avg.toFixed(1)),
        jitter: parseFloat(pingResult.jitter.toFixed(1)),
      }));
      setLiveValue(parseFloat(pingResult.avg.toFixed(1)));

      // ── Phase 2: Download ─────────────────────────────────────────────────
      setPhase(PHASES.DOWNLOAD);
      setLiveValue(0);
      historyRef.current = [];

      const download = await measureDownload(signal, (mbps) => {
        const v = parseFloat(mbps.toFixed(2));
        setLiveValue(v);
        addHistory(v);
      });

      if (signal.aborted) return;

      setResults(prev => ({
        ...prev,
        download: parseFloat(download.toFixed(2)),
      }));

      // ── Phase 3: Upload ───────────────────────────────────────────────────
      setPhase(PHASES.UPLOAD);
      setLiveValue(0);
      historyRef.current = [];

      const upload = await measureUpload(signal, (mbps) => {
        const v = parseFloat(mbps.toFixed(2));
        setLiveValue(v);
        addHistory(v);
      });

      if (signal.aborted) return;

      setResults(prev => ({
        ...prev,
        upload: parseFloat(upload.toFixed(2)),
      }));

      setPhase(PHASES.DONE);

    } catch (err) {
      if (err.name === 'AbortError') {
        setPhase(PHASES.IDLE);
      } else {
        setError(err.message || 'Test failed');
        setPhase(PHASES.ERROR);
      }
    }
  }, [fetchServerInfo, addHistory]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setPhase(PHASES.IDLE);
    setLiveValue(0);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase(PHASES.IDLE);
    setResults(initialResults);
    setLiveValue(0);
    setError(null);
    historyRef.current = [];
    setHistory([]);
  }, []);

  return {
    phase,
    liveValue,
    results,
    history,
    error,
    serverInfo,
    start,
    stop,
    reset,
    isRunning: phase !== PHASES.IDLE && phase !== PHASES.DONE && phase !== PHASES.ERROR,
  };
}
