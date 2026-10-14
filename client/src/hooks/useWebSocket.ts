// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(url: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    if (!url) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Convert relative WS url to absolute with current host
    let fullUrl = url;
    if (url.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      fullUrl = `${protocol}//${window.location.host}${url}`;
    }

    const ws = new WebSocket(fullUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch {
        setLastMessage(event.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [url]);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (typeof msg === 'string') {
        wsRef.current.send(msg);
      } else {
        wsRef.current.send(JSON.stringify(msg));
      }
    }
  }, []);

  return { isConnected, lastMessage, sendMessage, ws: wsRef.current };
}
