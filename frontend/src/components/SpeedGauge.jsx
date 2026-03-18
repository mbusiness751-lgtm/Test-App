/**
 * SpeedGauge — animated circular arc gauge.
 * SVG-based, smooth needle + arc fill animation.
 */

import { useEffect, useRef, useState } from 'react';

// Gauge configuration
const RADIUS      = 120;
const STROKE_W    = 12;
const CENTER      = 160;
const START_ANGLE = -220; // degrees
const END_ANGLE   = 40;   // degrees
const TOTAL_SWEEP = END_ANGLE - START_ANGLE; // 260°

// Speed scale breakpoints → logarithmic feel
const MAX_SPEED = 1000; // Mbps

function speedToAngle(mbps) {
  const clamped = Math.min(Math.max(mbps, 0), MAX_SPEED);
  // Logarithmic scale for better visual spread across 0.1–1000 Mbps
  const logMax  = Math.log10(MAX_SPEED + 1);
  const logVal  = Math.log10(clamped + 1);
  const pct     = logVal / logMax;
  return START_ANGLE + pct * TOTAL_SWEEP;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const s   = polarToCartesian(cx, cy, r, startAngle);
  const e   = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// Tick marks for the gauge
const TICKS = [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000];

export default function SpeedGauge({ value = 0, phase = 'idle', unit = 'Mbps' }) {
  const [displayAngle, setDisplayAngle] = useState(START_ANGLE);
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef   = useRef(null);
  const prevRef  = useRef(START_ANGLE);
  const prevValRef = useRef(0);

  useEffect(() => {
    const targetAngle = speedToAngle(value);
    const targetValue = value;

    const animate = () => {
      prevRef.current += (targetAngle - prevRef.current) * 0.12;
      prevValRef.current += (targetValue - prevValRef.current) * 0.12;

      setDisplayAngle(prevRef.current);
      setDisplayValue(prevValRef.current);

      if (
        Math.abs(prevRef.current - targetAngle) > 0.1 ||
        Math.abs(prevValRef.current - targetValue) > 0.05
      ) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  // Reset on idle
  useEffect(() => {
    if (phase === 'idle') {
      prevRef.current = START_ANGLE;
      prevValRef.current = 0;
      setDisplayAngle(START_ANGLE);
      setDisplayValue(0);
    }
  }, [phase]);

  const isActive = phase !== 'idle' && phase !== 'done' && phase !== 'error';
  const isDone   = phase === 'done';

  // Arc path
  const arcPath    = describeArc(CENTER, CENTER, RADIUS, START_ANGLE, END_ANGLE);
  const activePath = displayAngle > START_ANGLE
    ? describeArc(CENTER, CENTER, RADIUS, START_ANGLE, displayAngle)
    : null;

  // Needle tip
  const needleTip = polarToCartesian(CENTER, CENTER, RADIUS - 18, displayAngle);
  const needleBase1 = polarToCartesian(CENTER, CENTER, 10, displayAngle + 90);
  const needleBase2 = polarToCartesian(CENTER, CENTER, 10, displayAngle - 90);

  // Phase-based accent color
  const accentColor = phase === 'download' ? '#00d4ff'
    : phase === 'upload'   ? '#a78bfa'
    : phase === 'ping'     ? '#34d399'
    : isDone               ? '#00d4ff'
    : '#4b5563';

  const glowColor = phase === 'download' ? 'rgba(0,212,255,0.4)'
    : phase === 'upload'   ? 'rgba(167,139,250,0.4)'
    : phase === 'ping'     ? 'rgba(52,211,153,0.4)'
    : 'transparent';

  const formattedValue = displayValue >= 100
    ? displayValue.toFixed(0)
    : displayValue >= 10
    ? displayValue.toFixed(1)
    : displayValue.toFixed(2);

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Outer glow ring when active */}
      {isActive && (
        <div
          className="absolute rounded-full animate-pulse-ring pointer-events-none"
          style={{
            width: 340,
            height: 340,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          }}
        />
      )}

      <svg
        viewBox="0 0 320 320"
        width="320"
        height="320"
        className="overflow-visible"
        aria-label={`Speed gauge showing ${formattedValue} ${unit}`}
      >
        <defs>
          {/* Gradient for active arc */}
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={accentColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="1" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Needle glow */}
          <filter id="needleGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE_W}
          strokeLinecap="round"
        />

        {/* Subtle gradient backing */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={STROKE_W + 6}
          strokeLinecap="round"
        />

        {/* Active arc */}
        {activePath && (
          <path
            d={activePath}
            fill="none"
            stroke="url(#arcGradient)"
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        )}

        {/* Tick marks */}
        {TICKS.map((tick) => {
          const angle = speedToAngle(tick);
          const inner = polarToCartesian(CENTER, CENTER, RADIUS - STROKE_W / 2 - 4, angle);
          const outer = polarToCartesian(CENTER, CENTER, RADIUS + STROKE_W / 2 + 4, angle);
          const label = polarToCartesian(CENTER, CENTER, RADIUS + STROKE_W / 2 + 16, angle);
          const isLit = displayAngle >= angle - 2;

          return (
            <g key={tick}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke={isLit ? accentColor : 'rgba(255,255,255,0.15)'}
                strokeWidth={tick === 0 || tick === 1000 ? 2 : 1}
                strokeLinecap="round"
              />
              {(tick === 0 || tick === 10 || tick === 100 || tick === 1000) && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill={isLit ? accentColor : 'rgba(255,255,255,0.3)'}
                  fontFamily="Space Mono, monospace"
                  style={{ transition: 'fill 0.3s ease' }}
                >
                  {tick === 1000 ? '1K' : tick}
                </text>
              )}
            </g>
          );
        })}

        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={accentColor}
          opacity={isActive || isDone ? 1 : 0.3}
          filter={isActive ? 'url(#needleGlow)' : undefined}
          style={{ transition: 'fill 0.3s ease, opacity 0.3s ease' }}
        />

        {/* Center hub */}
        <circle cx={CENTER} cy={CENTER} r={14}
          fill="#0e1117"
          stroke={accentColor}
          strokeWidth={2}
          opacity={isActive || isDone ? 1 : 0.3}
          style={{ transition: 'stroke 0.3s ease, opacity 0.3s ease' }}
        />
        <circle cx={CENTER} cy={CENTER} r={5}
          fill={accentColor}
          opacity={isActive || isDone ? 1 : 0.3}
          style={{ transition: 'fill 0.3s ease, opacity 0.3s ease' }}
        />

        {/* Speed value */}
        <text
          x={CENTER}
          y={CENTER + 48}
          textAnchor="middle"
          fontFamily="Syne, sans-serif"
          fontWeight="800"
          fontSize="42"
          fill="white"
        >
          {formattedValue}
        </text>

        {/* Unit */}
        <text
          x={CENTER}
          y={CENTER + 70}
          textAnchor="middle"
          fontFamily="Space Mono, monospace"
          fontSize="12"
          fill={accentColor}
          opacity="0.8"
          style={{ transition: 'fill 0.3s ease' }}
        >
          {unit}
        </text>
      </svg>
    </div>
  );
}
