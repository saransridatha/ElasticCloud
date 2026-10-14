// pages/DashboardPage.tsx
// AWS EC2 Console Dashboard overview

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useDashboard } from '../hooks/useDashboard';
import { useInstances } from '../hooks/useInstances';
import {
  Server,
  Cpu,
  Layers,
  HardDrive,
  Shield,
  Key,
  Plus,
  ArrowRight,
  RefreshCw,
  Activity,
  CheckCircle,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenLaunchWizard: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenLaunchWizard }) => {
  const navigate = useNavigate();
  const { summary, loading, refresh } = useDashboard();
  const { instances } = useInstances(10000);

  const recentInstances = instances.slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl select-text">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-squid-900 via-squid-800 to-squid-900 border border-squid-700 rounded-lg p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-aws-orange">
            AWS EC2 Cloud Orchestrator
          </span>
          <h2 className="text-2xl font-bold mt-1 tracking-tight">ElasticCloud Console</h2>
          <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
            Manage your isolated micro-VM instances, SSH key pairs, EBS block storage volumes, and virtual firewall security groups in us-east-1 (elastic-local-1a).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="lg"
            icon={<Plus className="w-4 h-4" />}
            onClick={onOpenLaunchWizard}
          >
            Launch Instance
          </Button>
        </div>
      </div>

      {/* Fleet Summary Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-console-text uppercase tracking-wider">
            Fleet Resource Summary
          </h3>
          <button
            onClick={refresh}
            className="text-xs text-console-text-secondary hover:text-console-text flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Running Instances */}
          <div
            onClick={() => navigate('/instances')}
            className="bg-console-surface border-l-4 border-l-emerald-400 border border-console-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between text-console-text-muted mb-2">
              <span className="text-xs font-semibold">Instances</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-console-text">
              {summary?.runningInstances || 0}
              <span className="text-xs font-normal text-console-text-muted ml-1">
                / {summary?.totalInstances || 0}
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Running Active</span>
            </div>
          </div>

          {/* Card 2: Total vCPUs */}
          <div className="bg-console-surface border-l-4 border-l-aws-orange border border-console-border rounded-lg p-4">
            <div className="flex items-center justify-between text-console-text-muted mb-2">
              <span className="text-xs font-semibold">vCPUs</span>
              <Cpu className="w-4 h-4 text-aws-orange" />
            </div>
            <div className="text-2xl font-bold font-mono text-console-text">
              {summary?.totalVcpus || 0}
            </div>
            <div className="text-[11px] text-console-text-secondary mt-1">
              Allocated Quota
            </div>
          </div>

          {/* Card 3: Memory */}
          <div className="bg-console-surface border-l-4 border-l-aws-teal border border-console-border rounded-lg p-4">
            <div className="flex items-center justify-between text-console-text-muted mb-2">
              <span className="text-xs font-semibold">Memory</span>
              <Activity className="w-4 h-4 text-aws-teal" />
            </div>
            <div className="text-2xl font-bold font-mono text-console-text">
              {summary ? ((summary.totalMemoryMb || 0) / 1024).toFixed(1) : '0'}
              <span className="text-xs font-normal text-console-text-muted ml-1">GiB</span>
            </div>
            <div className="text-[11px] text-console-text-secondary mt-1">
              Active RAM
            </div>
          </div>

          {/* Card 4: Volumes */}
          <div
            onClick={() => navigate('/volumes')}
            className="bg-console-surface border-l-4 border-l-purple-400 border border-console-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between text-console-text-muted mb-2">
              <span className="text-xs font-semibold">EBS Storage</span>
              <HardDrive className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-console-text">
              {summary?.totalStorageGb || 0}
              <span className="text-xs font-normal text-console-text-muted ml-1">GiB</span>
            </div>
            <div className="text-[11px] text-console-text-secondary mt-1">
              {summary?.totalVolumes || 0} Block Volumes
            </div>
          </div>

          {/* Card 5: Security Groups */}
          <div
            onClick={() => navigate('/security-groups')}
            className="bg-console-surface border-l-4 border-l-blue-400 border border-console-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between text-console-text-muted mb-2">
              <span className="text-xs font-semibold">Security Groups</span>
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-console-text">
              {summary?.totalSecurityGroups || 0}
            </div>
            <div className="text-[11px] text-console-text-secondary mt-1">
              Firewall Groups
            </div>
          </div>

          {/* Card 6: Key Pairs */}
          <div
            onClick={() => navigate('/keypairs')}
            className="bg-console-surface border-l-4 border-l-amber-400 border border-console-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between text-console-text-muted mb-2">
              <span className="text-xs font-semibold">Key Pairs</span>
              <Key className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-console-text">
              {summary?.totalKeyPairs || 0}
            </div>
            <div className="text-[11px] text-console-text-secondary mt-1">
              SSH Keys
            </div>
          </div>
        </div>
      </div>

      {/* Recent Instances Table */}
      <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-console-text">Recent Instances</h3>
            <p className="text-xs text-console-text-secondary">Overview of active compute resources</p>
          </div>
          <button
            onClick={() => navigate('/instances')}
            className="text-xs font-medium text-aws-orange hover:underline flex items-center gap-1"
          >
            <span>View all instances</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="border border-console-border rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-console-surface-alt/70 text-console-text-muted border-b border-console-border">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Instance ID</th>
                <th className="p-3">State</th>
                <th className="p-3">Type</th>
                <th className="p-3">Private IP</th>
                <th className="p-3">Public IP : Port</th>
                <th className="p-3">Launch Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-console-border font-sans">
              {recentInstances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-console-text-muted">
                    No instances launched yet.
                  </td>
                </tr>
              ) : (
                recentInstances.map((inst) => (
                  <tr
                    key={inst.id}
                    onClick={() => navigate('/instances')}
                    className="hover:bg-console-surface-alt/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-semibold text-console-text">{inst.name}</td>
                    <td className="p-3 font-mono text-[11px] text-aws-orange">{inst.id}</td>
                    <td className="p-3">
                      <Badge state={inst.state} size="sm" />
                    </td>
                    <td className="p-3 font-mono">{inst.instanceType}</td>
                    <td className="p-3 font-mono text-console-text-secondary">{inst.privateIp}</td>
                    <td className="p-3 font-mono">
                      {inst.publicIp ? `${inst.publicIp}:${inst.sshPort}` : '-'}
                    </td>
                    <td className="p-3 text-console-text-muted">
                      {new Date(inst.launchTime).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
