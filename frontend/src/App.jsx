/**
 * App — Root component. Wires all pieces together.
 *
 * Layout (desktop):
 *   ┌─────────────────────────────────────────┐
 *   │  Header: logo · server · theme           │
 *   ├──────────────────┬──────────────────────┤
 *   │                  │  Metric cards        │
 *   │   Speed Gauge    │  Server card         │
 *   │                  │  Phase steps         │
 *   │   Start button   ├──────────────────────┤
 *   │                  │  Live graph          │
 *   └──────────────────┴──────────────────────┘
 *
 * Mobile: single column, gauge → metrics → graph
 */

import { useEffect } from 'react';
import SpeedGauge       from './components/SpeedGauge';
import LiveGraph        from './components/LiveGraph';
import { MetricCard, QualityBadge } from './components/MetricCards';
import ServerCard       from './components/ServerCard';
import PhaseIndicator   from './components/PhaseIndicator';
import StartButton      from './components/StartButton';
import { useSpeedTest, PHASES } from './hooks/useSpeedTest';
import { useWebSocket } from './hooks/useWebSocket';

// Phase → gauge unit
const PHASE_UNIT = {
  [PHASES.PING]:     'ms',
  [PHASES.DOWNLOAD]: 'Mbps',
  [PHASES.UPLOAD]:   'Mbps',
  [PHASES.DONE]:     'Mbps',
  [PHASES.IDLE]:     'Mbps',
  [PHASES.ERROR]:    'Mbps',
};

export default function App() {
  const {
    phase, liveValue, results, history, error,
    serverInfo, start, stop, reset, isRunning,
  } = useSpeedTest();

  const { connected: wsConnected, send: wsSend } = useWebSocket();

  // Notify WS when test completes
  useEffect(() => {
    if (phase === PHASES.DONE && results.download !== null) {
      wsSend({
        type: 'result',
        download: results.download,
        upload:   results.upload,
        ping:     results.ping,
        jitter:   results.jitter,
      });
    }
  }, [phase]);

  const phaseLabel = {
    [PHASES.IDLE]:     'Ready to test',
    [PHASES.PING]:     'Measuring latency…',
    [PHASES.DOWNLOAD]: 'Testing download speed…',
    [PHASES.UPLOAD]:   'Testing upload speed…',
    [PHASES.DONE]:     'Test complete',
    [PHASES.ERROR]:    `Error: ${error}`,
  }[phase] || '';

  return (
    <div className="noise-overlay min-h-dvh relative">
      {/* Mesh background */}
      <div className="mesh-bg" />

      {/* Main content */}
      <div className="relative z-10 min-h-dvh flex flex-col">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black font-display"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #0090b3)',
                color: '#080b0f',
              }}
            >
              S
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white">
              Speed<span style={{ color: '#00d4ff' }}>Test</span>
            </span>
          </div>

          {/* Server location pill */}
          {serverInfo && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#34d399' }}
              />
              {serverInfo.server.city}, {serverInfo.server.country}
            </div>
          )}
        </header>

        {/* ── Main Layout ───────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col lg:flex-row gap-6 px-4 pb-8 max-w-5xl mx-auto w-full">

          {/* Left column: gauge + button */}
          <div className="flex flex-col items-center justify-center gap-6 lg:w-96 flex-shrink-0">

            {/* Phase status text */}
            <div className="h-5 flex items-center">
              <p
                className="text-xs font-mono tracking-widest uppercase text-center transition-all duration-300"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {phaseLabel}
              </p>
            </div>

            {/* Gauge */}
            <div className="animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
              <SpeedGauge
                value={liveValue}
                phase={phase}
                unit={PHASE_UNIT[phase]}
              />
            </div>

            {/* Phase steps */}
            <div className="animate-fade-slide-up" style={{ animationDelay: '0.2s' }}>
              <PhaseIndicator phase={phase} />
            </div>

            {/* Start / Stop button */}
            <div className="animate-fade-slide-up" style={{ animationDelay: '0.25s' }}>
              <StartButton phase={phase} onStart={start} onStop={stop} />
            </div>

            {/* Quality badge (shown after test) */}
            {phase === PHASES.DONE && (
              <div className="animate-fade-slide-up">
                <QualityBadge download={results.download} />
              </div>
            )}

            {/* Error state */}
            {phase === PHASES.ERROR && (
              <div
                className="px-4 py-2 rounded-xl text-sm font-mono text-center animate-fade-slide-up"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171',
                }}
              >
                {error || 'Connection failed. Check backend.'}
              </div>
            )}
          </div>

          {/* Right column: cards + graph */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Metric cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 animate-fade-slide-up"
              style={{ animationDelay: '0.15s' }}>
              <MetricCard
                type="download"
                value={results.download}
                active={phase === PHASES.DOWNLOAD}
              />
              <MetricCard
                type="upload"
                value={results.upload}
                active={phase === PHASES.UPLOAD}
              />
              <MetricCard
                type="ping"
                value={results.ping}
                active={phase === PHASES.PING}
              />
              <MetricCard
                type="jitter"
                value={results.jitter}
                active={phase === PHASES.PING}
              />
            </div>

            {/* Live graph card */}
            <div
              className="glass-card p-4 flex flex-col gap-2 animate-fade-slide-up flex-1"
              style={{ animationDelay: '0.2s', minHeight: 180 }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-mono tracking-widest uppercase"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Live Graph
                </span>
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background: phase === PHASES.UPLOAD
                      ? 'rgba(167,139,250,0.1)'
                      : 'rgba(0,212,255,0.1)',
                    color: phase === PHASES.UPLOAD ? '#a78bfa' : '#00d4ff',
                    opacity: isRunning ? 1 : 0.4,
                  }}
                >
                  {phase !== PHASES.IDLE && phase !== PHASES.DONE
                    ? phase.toUpperCase()
                    : 'IDLE'}
                </span>
              </div>
              <LiveGraph history={history} phase={phase} />
            </div>

            {/* Server + info row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-slide-up"
              style={{ animationDelay: '0.25s' }}>
              <ServerCard serverInfo={serverInfo} wsConnected={wsConnected} />

              {/* Tips / results card */}
              <div
                className="rounded-2xl p-4 flex flex-col gap-2"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {phase === PHASES.DONE ? (
                  <>
                    <p
                      className="text-xs font-mono tracking-widest uppercase mb-1"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      Summary
                    </p>
                    <SummaryRow label="Download" value={results.download} unit="Mbps" color="#00d4ff" />
                    <SummaryRow label="Upload"   value={results.upload}   unit="Mbps" color="#a78bfa" />
                    <SummaryRow label="Latency"  value={results.ping}     unit="ms"   color="#34d399" />
                    <SummaryRow label="Jitter"   value={results.jitter}   unit="ms"   color="#fbbf24" />
                  </>
                ) : (
                  <>
                    <p
                      className="text-xs font-mono tracking-widest uppercase mb-1"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      How it works
                    </p>
                    <Tip text="Downloads multiple files in parallel streams" />
                    <Tip text="Uploads random binary blobs to measure throughput" />
                    <Tip text="Pings 12 times to compute median latency + jitter" />
                    <Tip text="Logarithmic scale for accuracy across 0.1–1000 Mbps" />
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="text-center py-4 px-6">
          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
            SpeedTest v1.0 · Built with Node.js + React ·{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>
              {new Date().getFullYear()}
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, unit, color }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </span>
      <span className="font-mono text-sm font-bold" style={{ color }}>
        {value !== null
          ? `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${unit}`
          : '—'}
      </span>
    </div>
  );
}

function Tip({ text }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
        ›
      </span>
      <p className="text-xs font-body leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {text}
      </p>
    </div>
  );
}
