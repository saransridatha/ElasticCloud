// components/monitoring/SystemLog.tsx
import React, { useState, useEffect, useRef } from 'react';
import { CopyButton } from '../common/CopyButton';
import { SearchInput } from '../common/SearchInput';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { fetchInstanceLogs } from '../../api/client';

interface SystemLogProps {
  instanceId: string;
}

export const SystemLog: React.FC<SystemLogProps> = ({ instanceId }) => {
  const [logs, setLogs] = useState<string>('Loading instance system logs...');
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const logContainerRef = useRef<HTMLPreElement>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const text = await fetchInstanceLogs(instanceId);
      setLogs(text || 'No logs generated yet.');
    } catch (err: any) {
      setLogs(`Error loading logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 8000);
    return () => clearInterval(interval);
  }, [instanceId]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter
    ? logs
        .split('\n')
        .filter((line) => line.toLowerCase().includes(filter.toLowerCase()))
        .join('\n')
    : logs;

  return (
    <div className="flex flex-col h-full bg-squid-950 text-gray-300 rounded border border-console-border overflow-hidden">
      {/* Log Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-squid-800 bg-squid-900 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-200">System Boot & SSHD Log</span>
          <SearchInput
            value={filter}
            onChange={setFilter}
            placeholder="Filter logs..."
            className="w-56"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              autoScroll ? 'bg-aws-orange/20 text-aws-orange' : 'text-gray-400 hover:text-white'
            }`}
            title="Auto-scroll to bottom"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Auto-scroll</span>
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-squid-800 transition-colors disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <CopyButton text={logs} label="Copy Log" className="text-gray-300 hover:text-white hover:bg-squid-800" />
        </div>
      </div>

      {/* Log Output */}
      <pre
        ref={logContainerRef}
        className="flex-1 p-3 overflow-auto font-mono text-[11px] leading-relaxed text-emerald-400/90 whitespace-pre-wrap select-text selection:bg-aws-orange/30"
      >
        {filteredLogs}
      </pre>
    </div>
  );
};
