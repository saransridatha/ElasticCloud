// components/security-groups/FirewallTester.tsx
// Interactive Packet Simulator testing firewall packet verdicts in real time

import React, { useState } from 'react';
import { Button } from '../common/Button';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type {
  SecurityGroup,
  RuleProtocol,
  RuleDirection,
  FirewallTestResult,
} from '@shared/types';

interface FirewallTesterProps {
  securityGroup: SecurityGroup | null;
  onTest: (packet: any) => Promise<FirewallTestResult>;
}

export const FirewallTester: React.FC<FirewallTesterProps> = ({ securityGroup, onTest }) => {
  const [direction, setDirection] = useState<RuleDirection>('inbound');
  const [protocol, setProtocol] = useState<RuleProtocol>('tcp');
  const [sourceIp, setSourceIp] = useState('198.51.100.25');
  const [sourcePort, setSourcePort] = useState(54321);
  const [destIp, setDestIp] = useState('172.31.16.42');
  const [destPort, setDestPort] = useState(22);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FirewallTestResult | null>(null);

  if (!securityGroup) {
    return (
      <div className="p-8 text-center text-console-text-muted text-xs">
        Select a security group to test firewall rules.
      </div>
    );
  }

  const handleTest = async () => {
    try {
      setLoading(true);
      const res = await onTest({
        securityGroupId: securityGroup.id,
        direction,
        protocol,
        sourceIp,
        sourcePort: Number(sourcePort),
        destIp,
        destPort: Number(destPort),
      });
      setResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreset = (preset: 'ssh' | 'http' | 'blocked') => {
    if (preset === 'ssh') {
      setDirection('inbound');
      setProtocol('tcp');
      setSourceIp('203.0.113.19');
      setDestPort(22);
    } else if (preset === 'http') {
      setDirection('inbound');
      setProtocol('tcp');
      setSourceIp('198.51.100.4');
      setDestPort(80);
    } else if (preset === 'blocked') {
      setDirection('inbound');
      setProtocol('tcp');
      setSourceIp('192.0.2.1');
      setDestPort(3306);
    }
  };

  return (
    <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-5 text-xs select-text">
      <div className="flex items-center justify-between border-b border-console-border pb-3">
        <div>
          <h4 className="font-semibold text-sm text-console-text flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-aws-orange" />
            Firewall Rule Tester & Packet Simulator
          </h4>
          <p className="text-console-text-secondary text-[11px] mt-0.5">
            Simulate network packets against security group <code className="font-mono text-aws-orange">{securityGroup.name}</code> to verify ALLOW / DROP decisions.
          </p>
        </div>

        {/* Quick test presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-console-text-muted mr-1">Presets:</span>
          <button
            onClick={() => handleQuickPreset('ssh')}
            className="px-2 py-0.5 bg-console-surface-alt hover:bg-console-border rounded text-[10px] text-console-text transition-colors"
          >
            SSH :22
          </button>
          <button
            onClick={() => handleQuickPreset('http')}
            className="px-2 py-0.5 bg-console-surface-alt hover:bg-console-border rounded text-[10px] text-console-text transition-colors"
          >
            HTTP :80
          </button>
          <button
            onClick={() => handleQuickPreset('blocked')}
            className="px-2 py-0.5 bg-console-surface-alt hover:bg-console-border rounded text-[10px] text-console-text transition-colors"
          >
            MySQL :3306
          </button>
        </div>
      </div>

      {/* Simulator Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-console-text block mb-1">Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as RuleDirection)}
            className="w-full px-2.5 py-1.5 bg-console-surface-alt border border-console-border rounded text-console-text font-medium"
          >
            <option value="inbound">Inbound (Ingress)</option>
            <option value="outbound">Outbound (Egress)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-console-text block mb-1">Protocol</label>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as RuleProtocol)}
            className="w-full px-2.5 py-1.5 bg-console-surface-alt border border-console-border rounded text-console-text font-medium uppercase font-mono"
          >
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="icmp">ICMP</option>
            <option value="all">ALL</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-console-text block mb-1">Source IP</label>
          <input
            type="text"
            value={sourceIp}
            onChange={(e) => setSourceIp(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-console-surface-alt border border-console-border rounded text-console-text font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-console-text block mb-1">Source Port</label>
          <input
            type="number"
            value={sourcePort}
            onChange={(e) => setSourcePort(parseInt(e.target.value, 10))}
            className="w-full px-2.5 py-1.5 bg-console-surface-alt border border-console-border rounded text-console-text font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-console-text block mb-1">Destination IP</label>
          <input
            type="text"
            value={destIp}
            onChange={(e) => setDestIp(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-console-surface-alt border border-console-border rounded text-console-text font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-console-text block mb-1">Dest Port</label>
          <input
            type="number"
            value={destPort}
            onChange={(e) => setDestPort(parseInt(e.target.value, 10))}
            className="w-full px-2.5 py-1.5 bg-console-surface-alt border border-console-border rounded text-console-text font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-console-text-muted text-[11px] font-mono">
          <span>{sourceIp}:{sourcePort}</span>
          <ArrowRight className="w-3.5 h-3.5" />
          <span>{destIp}:{destPort}</span>
          <span>({protocol.toUpperCase()})</span>
        </div>

        <Button
          variant="primary"
          icon={<Play className="w-3.5 h-3.5" />}
          onClick={handleTest}
          disabled={loading}
        >
          {loading ? 'Evaluating...' : 'Test Packet'}
        </Button>
      </div>

      {/* Result Display */}
      {result && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3.5 transition-all animate-fade-in ${
            result.allowed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {result.allowed ? (
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide">
                {result.allowed ? 'VERDICT: ALLOWED' : 'VERDICT: BLOCKED / DROPPED'}
              </span>
              {result.matchedRule && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-black/30 font-mono text-gray-200">
                  Matched Rule: {result.matchedRule.id}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed opacity-90">{result.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
