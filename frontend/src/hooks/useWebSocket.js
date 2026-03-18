/**
 * useWebSocket — manages WS connection lifecycle.
 * Provides connection state and message sender.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
    : 'ws://localhost:3001/ws');

export function useWebSocket() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let retries = 0;
    const MAX_RETRIES = 3;

    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          retries = 0;
        };

        ws.onmessage = (e) => {
          try {
            setLastMessage(JSON.parse(e.data));
          } catch (_) {}
        };

        ws.onclose = () => {
          setConnected(false);
          if (retries < MAX_RETRIES) {
            retries++;
            reconnectTimer = setTimeout(connect, 2000 * retries);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (_) {
        // WS unavailable — app still works via HTTP
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, lastMessage, send };
}
