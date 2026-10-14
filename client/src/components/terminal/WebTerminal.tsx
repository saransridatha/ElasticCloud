// components/terminal/WebTerminal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { RefreshCw, Terminal as TerminalIcon, Wifi, WifiOff } from 'lucide-react';

interface WebTerminalProps {
  instanceId: string;
}

export const WebTerminal: React.FC<WebTerminalProps> = ({ instanceId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const connect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }

    if (!terminalRef.current) return;

    setStatus('connecting');

    // Create xterm instance
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Source Code Pro, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#ff9900',
        selectionBackground: 'rgba(255, 153, 0, 0.3)',
        black: '#161b22',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal?instanceId=${instanceId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      term.focus();
      // Send initial terminal dimensions
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      setStatus('disconnected');
      term.write('\r\n\x1b[31m[WebSocket connection closed]\x1b[0m\r\n');
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && ws.readyState === WebSocket.OPEN) {
        fitAddonRef.current.fit();
        ws.send(
          JSON.stringify({
            type: 'resize',
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          })
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
      if (wsRef.current) wsRef.current.close();
      if (xtermRef.current) xtermRef.current.dispose();
    };
  }, [instanceId]);

  return (
    <div className="flex flex-col h-full bg-squid-950 rounded border border-console-border overflow-hidden">
      {/* Terminal Top Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-squid-800 bg-squid-900 text-xs">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-aws-orange" />
          <span className="font-semibold text-gray-200">EC2 Instance Connect Terminal</span>
          <span className="font-mono text-[11px] text-gray-400">({instanceId})</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {status === 'connected' && (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Connected</span>
              </>
            )}
            {status === 'connecting' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400">Connecting...</span>
              </>
            )}
            {status === 'disconnected' && (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">Disconnected</span>
              </>
            )}
          </div>

          <button
            onClick={connect}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-gray-300 hover:text-white hover:bg-squid-800 transition-colors"
            title="Reconnect terminal"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div ref={terminalRef} className="flex-1 w-full h-full p-1 overflow-hidden" />
    </div>
  );
};
