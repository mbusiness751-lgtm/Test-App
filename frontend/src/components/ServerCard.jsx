/**
 * ServerCard — displays test server location and client IP info.
 */

export default function ServerCard({ serverInfo, wsConnected }) {
  const server = serverInfo?.server;
  const client = serverInfo?.client;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Server location */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}
        >
          ⌘
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-body">Test Server</p>
          <p className="text-sm text-white font-display font-semibold truncate">
            {server ? `${server.city}, ${server.country}` : '—'}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dark-border" />

      {/* Client IP */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}
        >
          ◈
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-body">Your IP</p>
          <p className="text-sm text-white font-mono truncate">
            {client?.ip || '—'}
          </p>
        </div>
      </div>

      {/* WS status */}
      <div className="flex items-center gap-2 pt-1">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: wsConnected ? '#34d399' : '#4b5563',
            boxShadow: wsConnected ? '0 0 6px #34d399' : 'none',
          }}
        />
        <span className="text-xs text-gray-600 font-mono">
          {wsConnected ? 'Live connection' : 'Connecting…'}
        </span>
      </div>
    </div>
  );
}
