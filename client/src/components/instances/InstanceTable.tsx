// components/instances/InstanceTable.tsx
import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { CopyButton } from '../common/CopyButton';
import { StateDropdown } from './StateDropdown';
import {
  Server,
  Terminal,
  Play,
  RotateCw,
  Plus,
  RefreshCw,
  CheckSquare,
  Square,
  Cpu,
} from 'lucide-react';
import type { Instance } from '@shared/types';

interface InstanceTableProps {
  instances: Instance[];
  selectedInstance: Instance | null;
  onSelectInstance: (instance: Instance | null) => void;
  onLaunchClick: () => void;
  onConnectClick: (instance: Instance) => void;
  onAction: (id: string, action: 'start' | 'stop' | 'reboot' | 'terminate') => Promise<void>;
  onRefresh: () => void;
  loading?: boolean;
}

export const InstanceTable: React.FC<InstanceTableProps> = ({
  instances,
  selectedInstance,
  onSelectInstance,
  onLaunchClick,
  onConnectClick,
  onAction,
  onRefresh,
  loading = false,
}) => {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const filteredInstances = instances.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.id.toLowerCase().includes(search.toLowerCase()) ||
      inst.privateIp.includes(search) ||
      inst.publicIp.includes(search) ||
      inst.amiId.toLowerCase().includes(search.toLowerCase());

    const matchesState = stateFilter === 'all' || inst.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const getOsIcon = (amiId: string) => {
    if (amiId.includes('ubuntu')) return '🐧 Ubuntu';
    if (amiId.includes('debian')) return '🌀 Debian';
    if (amiId.includes('alpine')) return '🏔️ Alpine';
    return '🐧 Linux';
  };

  return (
    <div className="flex flex-col h-full bg-console-surface text-console-text select-text">
      {/* Top Action Toolbar */}
      <div className="p-3 border-b border-console-border bg-console-surface-alt/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onLaunchClick}>
            Launch instances
          </Button>

          <Button
            variant="secondary"
            icon={<Terminal className="w-4 h-4" />}
            disabled={!selectedInstance || selectedInstance.state !== 'running'}
            onClick={() => selectedInstance && onConnectClick(selectedInstance)}
          >
            Connect
          </Button>

          <StateDropdown instance={selectedInstance} onAction={onAction} />

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded text-console-text-secondary hover:text-console-text hover:bg-console-surface-alt border border-console-border transition-colors disabled:opacity-50"
            title="Refresh table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* State Filter Dropdown */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="text-xs bg-console-surface border border-console-border rounded px-2.5 py-1.5 text-console-text focus:outline-none focus:border-aws-orange"
          >
            <option value="all">All instance states</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="pending">Pending</option>
            <option value="stopping">Stopping</option>
            <option value="terminated">Terminated</option>
          </select>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search instances by name, ID, IP..."
            className="w-64"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-console-surface-alt/80 text-console-text-muted sticky top-0 border-b border-console-border select-none z-10 backdrop-blur-xs">
            <tr>
              <th className="w-10 p-3 text-center">
                <Square className="w-4 h-4 text-console-text-muted opacity-40 mx-auto" />
              </th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Instance ID</th>
              <th className="p-3 font-semibold">Instance State</th>
              <th className="p-3 font-semibold">AMI / OS</th>
              <th className="p-3 font-semibold">Instance Type</th>
              <th className="p-3 font-semibold">vCPU / RAM</th>
              <th className="p-3 font-semibold">Private IP</th>
              <th className="p-3 font-semibold">Public IP : SSH Port</th>
              <th className="p-3 font-semibold">Security Groups</th>
              <th className="p-3 font-semibold">Launch Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-console-border font-sans">
            {filteredInstances.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-console-text-secondary">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Server className="w-8 h-8 text-console-text-muted stroke-[1.5]" />
                    <p className="font-medium text-sm">No instances found</p>
                    <p className="text-xs text-console-text-muted">
                      {search || stateFilter !== 'all'
                        ? 'Try adjusting your search query or state filter'
                        : 'Click "Launch instances" to provision your first micro-VM instance'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInstances.map((inst) => {
                const isSelected = selectedInstance?.id === inst.id;
                return (
                  <tr
                    key={inst.id}
                    onClick={() => onSelectInstance(isSelected ? null : inst)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-aws-orange/10 dark:bg-aws-orange/15 border-l-4 border-l-aws-orange font-medium'
                        : 'hover:bg-console-surface-alt/50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectInstance(isSelected ? null : inst)}
                        className="text-console-text-secondary hover:text-aws-orange"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-aws-orange" />
                        ) : (
                          <Square className="w-4 h-4 text-console-text-muted group-hover:text-console-text" />
                        )}
                      </button>
                    </td>

                    {/* Name */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-semibold text-console-text truncate max-w-[160px]">
                        {inst.name}
                      </div>
                    </td>

                    {/* Instance ID */}
                    <td className="p-3 font-mono text-[11px] text-aws-orange">
                      <div className="flex items-center gap-1">
                        <span>{inst.id}</span>
                        <CopyButton text={inst.id} />
                      </div>
                    </td>

                    {/* State */}
                    <td className="p-3">
                      <Badge state={inst.state} size="sm" />
                    </td>

                    {/* AMI / OS */}
                    <td className="p-3 whitespace-nowrap">
                      <span>{getOsIcon(inst.amiId)}</span>
                    </td>

                    {/* Instance Type */}
                    <td className="p-3 font-mono font-medium text-console-text">
                      {inst.instanceType}
                    </td>

                    {/* vCPU / RAM */}
                    <td className="p-3 text-console-text-secondary whitespace-nowrap">
                      <span>{inst.vcpus} vCPU</span>
                      <span className="text-console-text-muted mx-1">/</span>
                      <span>{(inst.memoryMb / 1024).toFixed(inst.memoryMb >= 1024 ? 0 : 1)} GB</span>
                    </td>

                    {/* Private IP */}
                    <td className="p-3 font-mono text-console-text-secondary">
                      <div className="flex items-center gap-1">
                        <span>{inst.privateIp}</span>
                        <CopyButton text={inst.privateIp} />
                      </div>
                    </td>

                    {/* Public IP : Port */}
                    <td className="p-3 font-mono">
                      {inst.publicIp ? (
                        <div className="flex items-center gap-1 text-console-text">
                          <span>{inst.publicIp}</span>
                          <span className="text-aws-orange font-semibold">:{inst.sshPort}</span>
                          <CopyButton text={`${inst.publicIp}:${inst.sshPort}`} />
                        </div>
                      ) : (
                        <span className="text-console-text-muted">-</span>
                      )}
                    </td>

                    {/* Security Groups */}
                    <td className="p-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {inst.securityGroupIds.map((sgId) => (
                          <span
                            key={sgId}
                            className="px-1.5 py-0.5 rounded bg-console-surface-alt border border-console-border text-[10px] font-mono text-console-text-secondary"
                          >
                            {sgId}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Launch Time */}
                    <td className="p-3 text-console-text-muted whitespace-nowrap">
                      {new Date(inst.launchTime).toLocaleDateString()} {new Date(inst.launchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
