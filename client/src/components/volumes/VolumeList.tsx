// components/volumes/VolumeList.tsx
// EBS Block Volumes management table

import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { CopyButton } from '../common/CopyButton';
import { HardDrive, RefreshCw, Database, Server } from 'lucide-react';
import type { Volume } from '@shared/types';

interface VolumeListProps {
  volumes: Volume[];
  onRefresh: () => void;
  loading?: boolean;
}

export const VolumeList: React.FC<VolumeListProps> = ({ volumes, onRefresh, loading = false }) => {
  const [search, setSearch] = useState('');

  const filteredVolumes = volumes.filter(
    (v) =>
      v.id.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.volumeType.toLowerCase().includes(search.toLowerCase()) ||
      (v.attachedInstanceId && v.attachedInstanceId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-console-surface text-console-text select-text">
      {/* Toolbar */}
      <div className="p-3 border-b border-console-border bg-console-surface-alt/30 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search volumes by ID, name..."
          className="w-64"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-console-surface-alt/80 text-console-text-muted sticky top-0 border-b border-console-border backdrop-blur-xs select-none">
            <tr>
              <th className="p-3 font-semibold">Volume ID</th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Size</th>
              <th className="p-3 font-semibold">Volume Type</th>
              <th className="p-3 font-semibold">State</th>
              <th className="p-3 font-semibold">IOPS</th>
              <th className="p-3 font-semibold">Throughput</th>
              <th className="p-3 font-semibold">Attached Instance</th>
              <th className="p-3 font-semibold">Device</th>
              <th className="p-3 font-semibold">Delete on Termination</th>
              <th className="p-3 font-semibold">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-console-border font-sans">
            {filteredVolumes.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-console-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <HardDrive className="w-8 h-8 opacity-40" />
                    <p className="font-medium text-sm">No EBS volumes found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVolumes.map((vol) => (
                <tr key={vol.id} className="hover:bg-console-surface-alt/40 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-aws-orange">
                    <div className="flex items-center gap-1">
                      <span>{vol.id}</span>
                      <CopyButton text={vol.id} />
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-console-text">{vol.name}</td>
                  <td className="p-3 font-medium text-console-text">{vol.sizeGb} GiB</td>
                  <td className="p-3 uppercase font-mono">{vol.volumeType}</td>
                  <td className="p-3">
                    <Badge state={vol.state} size="sm" />
                  </td>
                  <td className="p-3 font-mono">{vol.iops} IOPS</td>
                  <td className="p-3 font-mono">{vol.throughput} MB/s</td>
                  <td className="p-3 font-mono text-console-text">
                    {vol.attachedInstanceId ? (
                      <span className="flex items-center gap-1 text-aws-orange">
                        <Server className="w-3 h-3" />
                        {vol.attachedInstanceId}
                      </span>
                    ) : (
                      <span className="text-console-text-muted">-</span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-console-text-secondary">{vol.deviceName}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        vol.deleteOnTermination
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {vol.deleteOnTermination ? 'True' : 'False'}
                    </span>
                  </td>
                  <td className="p-3 text-console-text-muted whitespace-nowrap">
                    {new Date(vol.createdAt).toLocaleDateString()} {new Date(vol.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
