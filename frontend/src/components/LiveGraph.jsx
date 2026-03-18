/**
 * LiveGraph — real-time sparkline showing speed over test duration.
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const CustomTooltip = ({ active, payload, accentColor }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg px-3 py-1.5 text-xs font-mono">
      <span style={{ color: accentColor }}>
        {payload[0].value?.toFixed(2)} Mbps
      </span>
    </div>
  );
};

export default function LiveGraph({ history = [], phase = 'idle' }) {
  const accentColor = phase === 'upload' ? '#a78bfa' : '#00d4ff';
  const gradientId  = `grad-${phase}`;

  // Normalize timestamps to seconds from start
  const data = useMemo(() => {
    if (!history.length) return [];
    const t0 = history[0].time;
    return history.map(p => ({
      t: parseFloat(((p.time - t0) / 1000).toFixed(1)),
      mbps: parseFloat(p.mbps.toFixed(2)),
    }));
  }, [history]);

  const maxY = useMemo(() => {
    if (!data.length) return 10;
    const max = Math.max(...data.map(d => d.mbps));
    return Math.ceil(max * 1.3) || 10;
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="h-28 flex items-center justify-center">
        <div className="text-xs text-gray-600 font-mono tracking-widest">
          AWAITING DATA
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={accentColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />

          <XAxis
            dataKey="t"
            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Space Mono' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={v => `${v}s`}
          />

          <YAxis
            domain={[0, maxY]}
            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Space Mono' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
          />

          <Tooltip
            content={<CustomTooltip accentColor={accentColor} />}
            cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          <Area
            type="monotoneX"
            dataKey="mbps"
            stroke={accentColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
