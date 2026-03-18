/**
 * PhaseIndicator — shows test progress steps with animated state.
 */

import { PHASES } from '../hooks/useSpeedTest';

const STEPS = [
  { phase: PHASES.PING,     label: 'Ping',     icon: '◎', color: '#34d399' },
  { phase: PHASES.DOWNLOAD, label: 'Download', icon: '↓', color: '#00d4ff' },
  { phase: PHASES.UPLOAD,   label: 'Upload',   icon: '↑', color: '#a78bfa' },
];

const phaseOrder = [PHASES.IDLE, PHASES.PING, PHASES.DOWNLOAD, PHASES.UPLOAD, PHASES.DONE];

export default function PhaseIndicator({ phase }) {
  const currentIdx = phaseOrder.indexOf(phase);

  return (
    <div className="flex items-center gap-2 justify-center">
      {STEPS.map((step, i) => {
        const stepIdx = phaseOrder.indexOf(step.phase);
        const isActive    = phase === step.phase;
        const isCompleted = currentIdx > stepIdx;
        const isPending   = currentIdx < stepIdx;

        return (
          <div key={step.phase} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              {/* Circle indicator */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 relative"
                style={{
                  background: isActive
                    ? `${step.color}20`
                    : isCompleted
                    ? `${step.color}15`
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${
                    isActive
                      ? step.color
                      : isCompleted
                      ? `${step.color}50`
                      : 'rgba(255,255,255,0.08)'
                  }`,
                  color: isActive
                    ? step.color
                    : isCompleted
                    ? `${step.color}aa`
                    : 'rgba(255,255,255,0.2)',
                  boxShadow: isActive ? `0 0 12px ${step.color}50` : 'none',
                }}
              >
                {isCompleted ? (
                  <span className="text-xs" style={{ color: step.color }}>✓</span>
                ) : (
                  <span className={isActive ? 'animate-pulse' : ''}>{step.icon}</span>
                )}

                {/* Active pulse ring */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: `${step.color}20` }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className="text-xs font-mono transition-all duration-300"
                style={{
                  color: isActive
                    ? step.color
                    : isCompleted
                    ? 'rgba(255,255,255,0.4)'
                    : 'rgba(255,255,255,0.15)',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className="w-8 h-px mb-5 transition-all duration-500"
                style={{
                  background: isCompleted
                    ? `linear-gradient(90deg, ${step.color}60, ${STEPS[i+1].color}60)`
                    : 'rgba(255,255,255,0.06)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
