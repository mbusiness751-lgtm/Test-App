/**
 * MetricCard — stat display card with animated value reveal.
 */

import { useEffect, useRef, useState } from 'react';

function AnimatedNumber({ target, decimals = 2, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const startValRef = useRef(0);

  useEffect(() => {
    if (target === null) { setDisplay(0); return; }
    const from = startValRef.current;
    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startValRef.current = target;
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return (
    <span>
      {target === null
        ? '—'
        : display >= 100
        ? display.toFixed(0)
        : display >= 10
        ? display.toFixed(Math.min(decimals, 1))
        : display.toFixed(decimals)
      }
    </span>
  );
}

const CARD_VARIANTS = {
  download: {
    label:  'Download',
    unit:   'Mbps',
    icon:   '↓',
    color:  '#00d4ff',
    bg:     'rgba(0,212,255,0.06)',
    border: 'rgba(0,212,255,0.15)',
  },
  upload: {
    label:  'Upload',
    unit:   'Mbps',
    icon:   '↑',
    color:  '#a78bfa',
    bg:     'rgba(167,139,250,0.06)',
    border: 'rgba(167,139,250,0.15)',
  },
  ping: {
    label:  'Ping',
    unit:   'ms',
    icon:   '◎',
    color:  '#34d399',
    bg:     'rgba(52,211,153,0.06)',
    border: 'rgba(52,211,153,0.15)',
  },
  jitter: {
    label:  'Jitter',
    unit:   'ms',
    icon:   '≈',
    color:  '#fbbf24',
    bg:     'rgba(251,191,36,0.06)',
    border: 'rgba(251,191,36,0.15)',
  },
};

export function MetricCard({ type, value, active = false }) {
  const variant = CARD_VARIANTS[type];
  if (!variant) return null;

  return (
    <div
      className="relative rounded-2xl p-4 flex flex-col gap-1 transition-all duration-300"
      style={{
        background: active ? variant.bg : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? variant.border : 'rgba(255,255,255,0.06)'}`,
        boxShadow: active ? `0 0 20px ${variant.bg}` : 'none',
      }}
    >
      {/* Active pulse dot */}
      {active && (
        <span
          className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse"
          style={{ background: variant.color }}
        />
      )}

      {/* Icon */}
      <div
        className="text-lg font-mono leading-none mb-1"
        style={{ color: value !== null ? variant.color : 'rgba(255,255,255,0.2)' }}
      >
        {variant.icon}
      </div>

      {/* Value */}
      <div
        className="font-display font-bold leading-none"
        style={{
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          color: value !== null ? 'white' : 'rgba(255,255,255,0.2)',
        }}
      >
        <AnimatedNumber target={value} decimals={type === 'ping' || type === 'jitter' ? 1 : 2} />
      </div>

      {/* Label + unit */}
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-xs font-body text-gray-500">{variant.label}</span>
        <span
          className="text-xs font-mono"
          style={{ color: variant.color, opacity: 0.7 }}
        >
          {variant.unit}
        </span>
      </div>
    </div>
  );
}

// ── Quality badge ───────────────────────────────────────────────────────────

const QUALITY_BANDS = [
  { min: 500, label: 'Gigabit',   color: '#00d4ff' },
  { min: 100, label: 'Ultra Fast', color: '#34d399' },
  { min: 25,  label: 'Fast',      color: '#86efac' },
  { min: 10,  label: 'Good',      color: '#fbbf24' },
  { min: 5,   label: 'Fair',      color: '#fb923c' },
  { min: 0,   label: 'Slow',      color: '#f87171' },
];

export function QualityBadge({ download }) {
  if (download === null) return null;
  const band = QUALITY_BANDS.find(b => download >= b.min) || QUALITY_BANDS[QUALITY_BANDS.length - 1];

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase"
      style={{
        color: band.color,
        background: `${band.color}15`,
        border: `1px solid ${band.color}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: band.color }} />
      {band.label}
    </div>
  );
}
