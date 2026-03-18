/**
 * StartButton — large animated CTA button.
 */

import { PHASES } from '../hooks/useSpeedTest';

const PHASE_LABELS = {
  [PHASES.IDLE]:     'START',
  [PHASES.PING]:     'TESTING…',
  [PHASES.DOWNLOAD]: 'TESTING…',
  [PHASES.UPLOAD]:   'TESTING…',
  [PHASES.DONE]:     'RETEST',
  [PHASES.ERROR]:    'RETRY',
};

export default function StartButton({ phase, onStart, onStop }) {
  const isRunning = [PHASES.PING, PHASES.DOWNLOAD, PHASES.UPLOAD].includes(phase);
  const label = PHASE_LABELS[phase] || 'START';

  const handleClick = () => {
    if (isRunning) {
      onStop?.();
    } else {
      onStart?.();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer ambient glow rings */}
      {isRunning && (
        <>
          <div
            className="absolute rounded-full animate-ping"
            style={{
              width: 100,
              height: 100,
              background: 'rgba(0,212,255,0.08)',
              animationDuration: '2s',
            }}
          />
          <div
            className="absolute rounded-full animate-ping"
            style={{
              width: 80,
              height: 80,
              background: 'rgba(0,212,255,0.12)',
              animationDuration: '2s',
              animationDelay: '0.5s',
            }}
          />
        </>
      )}

      {/* Main button */}
      <button
        onClick={handleClick}
        aria-label={isRunning ? 'Stop speed test' : 'Start speed test'}
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 select-none active:scale-95"
        style={{
          background: isRunning
            ? 'rgba(248,113,113,0.15)'
            : 'rgba(0,212,255,0.12)',
          border: `2px solid ${isRunning ? '#f87171' : '#00d4ff'}`,
          boxShadow: isRunning
            ? '0 0 30px rgba(248,113,113,0.3), inset 0 0 20px rgba(248,113,113,0.05)'
            : '0 0 30px rgba(0,212,255,0.3), inset 0 0 20px rgba(0,212,255,0.05)',
          cursor: 'pointer',
        }}
      >
        {isRunning ? (
          /* Stop icon */
          <div
            className="w-6 h-6 rounded-sm"
            style={{ background: '#f87171' }}
          />
        ) : (
          /* Play / Retest icon */
          <span
            className="font-display font-black text-xs tracking-widest"
            style={{ color: '#00d4ff' }}
          >
            {label}
          </span>
        )}
      </button>
    </div>
  );
}
