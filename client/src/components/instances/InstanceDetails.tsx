// components/instances/InstanceDetails.tsx
// AWS-style bottom split-pane inspector with 6 tabs

import React, { useState, useEffect } from 'react';
import { Tabs } from '../common/Tabs';
import { Badge } from '../common/Badge';
import { CopyButton } from '../common/CopyButton';
import { MetricsChart } from '../monitoring/MetricsChart';
import { SystemLog } from '../monitoring/SystemLog';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useSecurityGroups } from '../../hooks/useSecurityGroups';
import { useVolumes } from '../../hooks/useVolumes';
import { X, ExternalLink, ShieldCheck, HardDrive, Network, Activity, FileText, Server } from 'lucide-react';
import type { Instance, InstanceMetrics } from '@shared/types';

interface InstanceDetailsProps {
  instance: Instance;
  onClose: () => void;
  onConnectClick?: () => void;
}

export const InstanceDetails: React.FC<InstanceDetailsProps> = ({
  instance,
  onClose,
  onConnectClick,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'security' | 'networking' | 'storage' | 'monitoring' | 'logs'>('details');
  const [metrics, setMetrics] = useState<InstanceMetrics | null>(null);

  const { securityGroups } = useSecurityGroups();
  const { volumes } = useVolumes();

  // Connect to live metrics WebSocket
  const { lastMessage } = useWebSocket(
    instance.state === 'running' ? `/ws/metrics?instanceId=${instance.id}` : null
  );

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'metrics' && lastMessage.data) {
      setMetrics(lastMessage.data);
    }
  }, [lastMessage]);

  const attachedSgs = securityGroups.filter((g) => instance.securityGroupIds.includes(g.id));
  const attachedVol = volumes.find((v) => v.id === instance.volumeId || v.attachedInstanceId === instance.id);

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'security', label: 'Security' },
    { id: 'networking', label: 'Networking' },
    { id: 'storage', label: 'Storage' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'logs', label: 'System Log' },
  ];

  const arn = `arn:aws:ec2:us-east-1:128940918842:instance/${instance.id}`;

  return (
    <div className="flex flex-col h-full bg-console-surface text-console-text select-text overflow-hidden">
      {/* Inspector Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-console-border bg-console-surface-alt/40 shrink-0">
        <div className="flex items-center gap-3">
          <Server className="w-4 h-4 text-aws-orange" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-console-text">{instance.name}</span>
            <span className="font-mono text-xs text-console-text-muted">({instance.id})</span>
            <CopyButton text={instance.id} />
          </div>
          <Badge state={instance.state} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          {onConnectClick && instance.state === 'running' && (
            <button
              onClick={onConnectClick}
              className="px-2.5 py-1 text-xs font-medium rounded bg-aws-orange text-white hover:bg-aws-orange-hover transition-colors"
            >
              Connect
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-console-text-secondary hover:text-console-text hover:bg-console-surface-alt transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 border-b border-console-border bg-console-surface shrink-0">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />
      </div>

      {/* Tab Content Panes */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Tab 1: Details */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="space-y-3">
              <h5 className="font-semibold uppercase tracking-wider text-[11px] text-console-text-muted border-b border-console-border pb-1">
                Instance Overview
              </h5>
              <div>
                <span className="text-console-text-secondary block">Instance ID:</span>
                <span className="font-mono font-medium text-console-text flex items-center gap-1">
                  {instance.id}
                  <CopyButton text={instance.id} />
                </span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Instance State:</span>
                <Badge state={instance.state} size="sm" />
              </div>
              <div>
                <span className="text-console-text-secondary block">Instance Type:</span>
                <span className="font-mono text-console-text font-medium">{instance.instanceType}</span>
                <span className="text-console-text-muted ml-2">
                  ({instance.vcpus} vCPU, {(instance.memoryMb / 1024).toFixed(1)} GB RAM)
                </span>
              </div>
              <div>
                <span className="text-console-text-secondary block">AMI ID:</span>
                <span className="font-mono text-console-text font-medium">{instance.amiId}</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Platform Details:</span>
                <span className="text-console-text capitalize">{instance.platform} ({instance.architecture})</span>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-semibold uppercase tracking-wider text-[11px] text-console-text-muted border-b border-console-border pb-1">
                Addressing & Network
              </h5>
              <div>
                <span className="text-console-text-secondary block">Private IPv4 Address:</span>
                <span className="font-mono text-console-text font-medium flex items-center gap-1">
                  {instance.privateIp}
                  <CopyButton text={instance.privateIp} />
                </span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Public IPv4 Address:</span>
                <span className="font-mono text-console-text font-medium flex items-center gap-1">
                  {instance.publicIp || 'None'}
                  {instance.publicIp && <CopyButton text={instance.publicIp} />}
                </span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Host Port Mapped (SSH):</span>
                <span className="font-mono text-aws-orange font-medium">{instance.sshPort || 'N/A'} &rarr; 22</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">MAC Address:</span>
                <span className="font-mono text-console-text">{instance.macAddress}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-semibold uppercase tracking-wider text-[11px] text-console-text-muted border-b border-console-border pb-1">
                Lifecycle & ARN
              </h5>
              <div>
                <span className="text-console-text-secondary block">Launch Time:</span>
                <span className="text-console-text">{new Date(instance.launchTime).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Key Pair Assigned:</span>
                <span className="font-mono text-console-text">{instance.keyPairId || 'None'}</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">ARN (Amazon Resource Name):</span>
                <div className="font-mono text-[10px] text-console-text-muted break-all flex items-center gap-1 bg-console-surface-alt p-1.5 rounded border border-console-border">
                  <span>{arn}</span>
                  <CopyButton text={arn} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Security */}
        {activeTab === 'security' && (
          <div className="space-y-5 text-xs">
            <div>
              <h5 className="font-semibold uppercase tracking-wider text-[11px] text-console-text-muted mb-2">
                Attached Security Groups ({attachedSgs.length})
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attachedSgs.map((sg) => (
                  <div key={sg.id} className="p-3 bg-console-surface-alt border border-console-border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-console-text">{sg.name}</span>
                      <span className="font-mono text-[11px] text-console-text-muted">{sg.id}</span>
                    </div>
                    <p className="text-console-text-secondary text-[11px] mb-2">{sg.description}</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {sg.inboundRules.length} Inbound Rules
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        {sg.outboundRules.length} Outbound Rules
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-semibold uppercase tracking-wider text-[11px] text-console-text-muted mb-2">
                Active Inbound Rules
              </h5>
              <div className="border border-console-border rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-console-surface-alt/70 text-console-text-muted border-b border-console-border">
                    <tr>
                      <th className="p-2">Type</th>
                      <th className="p-2">Protocol</th>
                      <th className="p-2">Port Range</th>
                      <th className="p-2">Source CIDR</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-console-border font-mono text-[11px]">
                    {attachedSgs.flatMap((g) => g.inboundRules).map((r) => (
                      <tr key={r.id} className="hover:bg-console-surface-alt/30">
                        <td className="p-2 font-sans font-medium text-console-text">{r.ruleType}</td>
                        <td className="p-2 uppercase">{r.protocol}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded bg-squid-800 text-gray-200">
                            {r.portRange}
                          </span>
                        </td>
                        <td className="p-2 text-console-text-secondary">{r.cidr}</td>
                        <td className="p-2">
                          <span className="text-emerald-400 font-bold">{r.action}</span>
                        </td>
                        <td className="p-2 font-sans text-console-text-secondary">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Networking */}
        {activeTab === 'networking' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3">
              <h5 className="font-semibold uppercase tracking-wider text-[11px] text-console-text-muted border-b border-console-border pb-1">
                Virtual Network Adapter
              </h5>
              <div>
                <span className="text-console-text-secondary block">Network Interface ID:</span>
                <span className="font-mono text-console-text">{instance.networkInterface}</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">MAC Address:</span>
                <span className="font-mono text-console-text">{instance.macAddress}</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Virtual Bridge Interface:</span>
                <span className="font-mono text-console-text">nimbus0 (veth pair)</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Interface MTU:</span>
                <span className="font-mono text-console-text">9001 (Jumbo Frames Supported)</span>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-semibold uppercase tracking-wider text-[11px] text-console-text-muted border-b border-console-border pb-1">
                IP Configurations
              </h5>
              <div>
                <span className="text-console-text-secondary block">Private IPv4 Address:</span>
                <span className="font-mono text-console-text">{instance.privateIp}</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Public IPv4 Address:</span>
                <span className="font-mono text-console-text">{instance.publicIp || 'None assigned'}</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">VPC ID:</span>
                <span className="font-mono text-console-text">vpc-0a1b2c3d4e5f6789</span>
              </div>
              <div>
                <span className="text-console-text-secondary block">Subnet ID:</span>
                <span className="font-mono text-console-text">subnet-01928bc1829a</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Storage */}
        {activeTab === 'storage' && (
          <div className="space-y-4 text-xs">
            <h5 className="font-semibold uppercase tracking-wider text-[11px] text-console-text-muted">
              Attached Block Volumes (EBS)
            </h5>
            <div className="border border-console-border rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-console-surface-alt/70 text-console-text-muted border-b border-console-border">
                  <tr>
                    <th className="p-2">Device Name</th>
                    <th className="p-2">Volume ID</th>
                    <th className="p-2">Size</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">IOPS</th>
                    <th className="p-2">Throughput</th>
                    <th className="p-2">Delete on Termination</th>
                    <th className="p-2">Encrypted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-console-border font-mono text-[11px]">
                  <tr className="hover:bg-console-surface-alt/30">
                    <td className="p-2 font-bold text-console-text">{attachedVol?.deviceName || '/dev/sda1'}</td>
                    <td className="p-2 text-aws-orange">{attachedVol?.id || instance.volumeId}</td>
                    <td className="p-2 font-sans font-medium">{attachedVol?.sizeGb || instance.storageSizeGb} GB</td>
                    <td className="p-2 uppercase">{attachedVol?.volumeType || instance.storageType}</td>
                    <td className="p-2">{attachedVol?.iops || 3000} IOPS</td>
                    <td className="p-2">{attachedVol?.throughput || 125} MB/s</td>
                    <td className="p-2 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${instance.deleteStorageOnTermination ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {instance.deleteStorageOnTermination ? 'True' : 'False'}
                      </span>
                    </td>
                    <td className="p-2 text-emerald-400 font-sans">Yes (KMS)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Monitoring */}
        {activeTab === 'monitoring' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-console-text-secondary">
                Live CloudWatch Telemetry (streaming via WebSocket every 5s)
              </span>
              <Badge state={instance.state} size="sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricsChart
                title="CPU Utilization"
                data={metrics?.cpuUtilization || []}
                unit="%"
                color="#ff9900"
                domain={[0, 100]}
              />
              <MetricsChart
                title="Memory Usage"
                data={metrics?.memoryUsageMb || []}
                unit="MB"
                color="#00a1c9"
                domain={[0, instance.memoryMb]}
              />
              <MetricsChart
                title="Network In"
                data={metrics?.networkInKbps || []}
                unit="KB/s"
                color="#10b981"
              />
              <MetricsChart
                title="Network Out"
                data={metrics?.networkOutKbps || []}
                unit="KB/s"
                color="#8b5cf6"
              />
            </div>
          </div>
        )}

        {/* Tab 6: System Log */}
        {activeTab === 'logs' && (
          <div className="h-72">
            <SystemLog instanceId={instance.id} />
          </div>
        )}
      </div>
    </div>
  );
};
