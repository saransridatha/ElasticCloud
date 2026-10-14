// components/launch-wizard/LaunchWizard.tsx
// AWS EC2 Launch Instance Wizard with sticky summary sidebar and granular hardware sliders

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  Server,
  Layers,
  Cpu,
  HardDrive,
  Shield,
  Key,
  Check,
  Info,
  DollarSign,
  Plus,
  Sliders,
} from 'lucide-react';
import {
  AVAILABLE_AMIS,
  INSTANCE_TYPES,
  type LaunchInstanceRequest,
  type KeyPair,
  type SecurityGroup,
  type VolumeType,
} from '@shared/types';

interface LaunchWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (req: LaunchInstanceRequest) => Promise<void>;
  keyPairs: KeyPair[];
  securityGroups: SecurityGroup[];
  initialAmiId?: string;
}

export const LaunchWizard: React.FC<LaunchWizardProps> = ({
  isOpen,
  onClose,
  onLaunch,
  keyPairs,
  securityGroups,
  initialAmiId,
}) => {
  const [name, setName] = useState('nimbus-instance-01');
  const [selectedAmiId, setSelectedAmiId] = useState(initialAmiId || 'ami-ubuntu2404');
  const [isCustomType, setIsCustomType] = useState(false);
  const [presetType, setPresetType] = useState('t3.micro');

  // Custom hardware sliders
  const [customVcpus, setCustomVcpus] = useState(1);
  const [customMemoryMb, setCustomMemoryMb] = useState(1024);

  // Storage
  const [storageSizeGb, setStorageSizeGb] = useState(20);
  const [storageType, setStorageType] = useState<VolumeType>('gp3');
  const [deleteStorageOnTermination, setDeleteStorageOnTermination] = useState(true);

  // Security & Keys
  const [selectedKeyPairId, setSelectedKeyPairId] = useState<string>(
    keyPairs.length > 0 ? keyPairs[0].id : ''
  );
  const [selectedSgIds, setSelectedSgIds] = useState<string[]>(['sg-default']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedAmi = AVAILABLE_AMIS.find((a) => a.id === selectedAmiId) || AVAILABLE_AMIS[0];
  const selectedPreset = INSTANCE_TYPES.find((t) => t.name === presetType) || INSTANCE_TYPES[1];

  const currentVcpus = isCustomType ? customVcpus : selectedPreset.vcpus;
  const currentMemoryMb = isCustomType ? customMemoryMb : selectedPreset.memory;

  // Hourly cost calculation: roughly $0.0208 per vCPU-hr + $0.005 per GB-hr RAM + $0.08 per GB-mo storage
  const computeHourly = currentVcpus * 0.02 + (currentMemoryMb / 1024) * 0.005;
  const storageMonthly = storageSizeGb * (storageType === 'io2' ? 0.125 : 0.08);
  const totalMonthlyCost = (computeHourly * 730 + storageMonthly).toFixed(2);

  const handleLaunch = async () => {
    if (!name.trim()) {
      setError('Please provide an instance name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: LaunchInstanceRequest = {
        name: name.trim(),
        amiId: selectedAmiId,
        instanceType: isCustomType ? 'custom' : presetType,
        vcpus: currentVcpus,
        memoryMb: currentMemoryMb,
        storageSizeGb,
        storageType,
        deleteStorageOnTermination,
        keyPairId: selectedKeyPairId || null,
        securityGroupIds: selectedSgIds.length > 0 ? selectedSgIds : ['sg-default'],
        tags: {
          Name: name.trim(),
          Environment: 'Development',
          Owner: 'ElasticCloudAdmin',
        },
      };

      await onLaunch(request);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to launch instance');
    } finally {
      setLoading(false);
    }
  };

  const toggleSg = (sgId: string) => {
    setSelectedSgIds((prev) =>
      prev.includes(sgId) ? (prev.length > 1 ? prev.filter((id) => id !== sgId) : prev) : [...prev, sgId]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Launch an instance" size="full">
      <div className="flex flex-col lg:flex-row gap-8 select-text">
        {/* Left Form: Scrollable Configurator */}
        <div className="flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Section 1: Name and tags */}
          <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-console-text flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-aws-orange text-white text-xs flex items-center justify-center font-bold">1</span>
              Name and tags
            </h3>
            <p className="text-xs text-console-text-secondary">
              A name helps you identify your instance in the console.
            </p>
            <div>
              <label className="text-xs font-semibold text-console-text block mb-1">Instance Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. web-production-cluster-01"
                className="w-full px-3 py-2 text-sm bg-console-surface-alt border border-console-border rounded text-console-text focus:outline-none focus:border-aws-orange"
              />
            </div>
          </div>

          {/* Section 2: Application and OS Images (AMIs) */}
          <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-console-text flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-aws-orange text-white text-xs flex items-center justify-center font-bold">2</span>
              Application and OS Images (Amazon Machine Image)
            </h3>
            <p className="text-xs text-console-text-secondary">
              Select an isolated Linux distribution for your micro-VM. All AMIs include openssh-server, iptables, iproute2, and sudo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {AVAILABLE_AMIS.map((ami) => {
                const isSelected = ami.id === selectedAmiId;
                return (
                  <div
                    key={ami.id}
                    onClick={() => setSelectedAmiId(ami.id)}
                    className={`cursor-pointer p-4 rounded-lg border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-aws-orange bg-aws-orange/5 dark:bg-aws-orange/10 shadow-xs'
                        : 'border-console-border bg-console-surface-alt/40 hover:border-console-border hover:bg-console-surface-alt'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">
                          {ami.icon === 'ubuntu' ? '🐧' : ami.icon === 'debian' ? '🌀' : '🏔️'}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-aws-orange text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-xs text-console-text">{ami.name}</h4>
                      <p className="text-[11px] text-console-text-secondary mt-1 line-clamp-2">
                        {ami.description}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-console-border/60 text-[10px] text-console-text-muted flex justify-between font-mono">
                      <span>User: {ami.defaultUser}</span>
                      <span>{ami.arch}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Instance Type */}
          <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-console-text flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-aws-orange text-white text-xs flex items-center justify-center font-bold">3</span>
                Instance Type
              </h3>

              <div className="flex items-center gap-2 text-xs bg-console-surface-alt p-1 rounded border border-console-border">
                <button
                  type="button"
                  onClick={() => setIsCustomType(false)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    !isCustomType ? 'bg-aws-orange text-white' : 'text-console-text-secondary hover:text-console-text'
                  }`}
                >
                  Preset Tiers
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomType(true)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                    isCustomType ? 'bg-aws-orange text-white' : 'text-console-text-secondary hover:text-console-text'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  Custom Sliders
                </button>
              </div>
            </div>

            {!isCustomType ? (
              <div>
                <label className="text-xs font-semibold text-console-text block mb-1">Select Preset Tier</label>
                <select
                  value={presetType}
                  onChange={(e) => setPresetType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-console-surface-alt border border-console-border rounded text-console-text focus:outline-none focus:border-aws-orange font-mono"
                >
                  {INSTANCE_TYPES.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.vcpus} vCPU, {(t.memory / 1024).toFixed(t.memory >= 1024 ? 0 : 1)} GB RAM) — {t.category}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-5 bg-console-surface-alt/40 p-4 rounded-lg border border-console-border">
                {/* vCPU Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs font-semibold">
                    <span className="text-console-text">vCPUs:</span>
                    <span className="text-aws-orange font-mono text-sm">{customVcpus} vCPUs</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="16"
                    step="0.5"
                    value={customVcpus}
                    onChange={(e) => setCustomVcpus(parseFloat(e.target.value))}
                    className="w-full accent-aws-orange cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-console-text-muted font-mono mt-1">
                    <span>0.5 vCPU</span>
                    <span>4 vCPU</span>
                    <span>8 vCPU</span>
                    <span>16 vCPU</span>
                  </div>
                </div>

                {/* RAM Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs font-semibold">
                    <span className="text-console-text">Memory (RAM):</span>
                    <span className="text-aws-orange font-mono text-sm">
                      {customMemoryMb >= 1024
                        ? `${(customMemoryMb / 1024).toFixed(1)} GB`
                        : `${customMemoryMb} MB`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="32768"
                    step="256"
                    value={customMemoryMb}
                    onChange={(e) => setCustomMemoryMb(parseInt(e.target.value, 10))}
                    className="w-full accent-aws-orange cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-console-text-muted font-mono mt-1">
                    <span>256 MB</span>
                    <span>8 GB</span>
                    <span>16 GB</span>
                    <span>32 GB</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Key Pair (login) */}
          <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-console-text flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-aws-orange text-white text-xs flex items-center justify-center font-bold">4</span>
              Key Pair (login)
            </h3>
            <p className="text-xs text-console-text-secondary">
              You can use a key pair to securely connect to your instance via SSH. Cloud-init will inject the public key on launch.
            </p>

            <div>
              <label className="text-xs font-semibold text-console-text block mb-1">Key Pair Name</label>
              {keyPairs.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                  No key pairs found in your account. You can proceed without a key pair or create one in the Key Pairs manager.
                </div>
              ) : (
                <select
                  value={selectedKeyPairId}
                  onChange={(e) => setSelectedKeyPairId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-console-surface-alt border border-console-border rounded text-console-text focus:outline-none focus:border-aws-orange font-mono"
                >
                  <option value="">Proceed without a key pair (not recommended)</option>
                  {keyPairs.map((kp) => (
                    <option key={kp.id} value={kp.id}>
                      {kp.name} ({kp.type.toUpperCase()}) — {kp.fingerprint.slice(0, 20)}...
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Section 5: Network settings & Security Groups */}
          <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-console-text flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-aws-orange text-white text-xs flex items-center justify-center font-bold">5</span>
              Network Settings & Firewall
            </h3>
            <p className="text-xs text-console-text-secondary">
              A security group acts as a virtual firewall that controls the traffic allowed to and from your instance.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-console-text block">Select Security Groups</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {securityGroups.map((sg) => {
                  const isChecked = selectedSgIds.includes(sg.id);
                  return (
                    <div
                      key={sg.id}
                      onClick={() => toggleSg(sg.id)}
                      className={`p-3 rounded border cursor-pointer transition-colors flex items-start gap-3 ${
                        isChecked
                          ? 'border-aws-orange bg-aws-orange/5 dark:bg-aws-orange/10'
                          : 'border-console-border bg-console-surface-alt/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 accent-aws-orange"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-console-text">{sg.name}</span>
                          <span className="font-mono text-[10px] text-console-text-muted">{sg.id}</span>
                        </div>
                        <p className="text-[11px] text-console-text-secondary">{sg.description}</p>
                        <div className="text-[10px] text-console-text-muted font-mono mt-1">
                          Inbound rules: {sg.inboundRules.map((r) => `${r.protocol.toUpperCase()}:${r.portRange}`).join(', ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 6: Configure Storage */}
          <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-console-text flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-aws-orange text-white text-xs flex items-center justify-center font-bold">6</span>
              Configure Storage (EBS Volume)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-console-text block mb-1">
                  Root Size (8 - 500 GB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="8"
                    max="500"
                    value={storageSizeGb}
                    onChange={(e) => setStorageSizeGb(parseInt(e.target.value, 10) || 8)}
                    className="w-full px-3 py-2 text-sm bg-console-surface-alt border border-console-border rounded text-console-text font-mono focus:outline-none focus:border-aws-orange"
                  />
                  <span className="text-xs font-semibold text-console-text-secondary">GiB</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-console-text block mb-1">Volume Type</label>
                <select
                  value={storageType}
                  onChange={(e) => setStorageType(e.target.value as VolumeType)}
                  className="w-full px-3 py-2 text-sm bg-console-surface-alt border border-console-border rounded text-console-text focus:outline-none focus:border-aws-orange font-mono"
                >
                  <option value="gp3">General Purpose SSD (gp3)</option>
                  <option value="io2">Provisioned IOPS SSD (io2)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-console-text block mb-1">Baseline IOPS</label>
                <div className="px-3 py-2 text-sm bg-console-surface-alt border border-console-border rounded text-console-text font-mono">
                  {storageType === 'io2' ? '5,000 IOPS' : '3,000 IOPS'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="deleteOnTerm"
                checked={deleteStorageOnTermination}
                onChange={(e) => setDeleteStorageOnTermination(e.target.checked)}
                className="accent-aws-orange"
              />
              <label htmlFor="deleteOnTerm" className="text-xs text-console-text select-none cursor-pointer">
                Delete on termination (Automatically delete root EBS volume when instance is terminated)
              </label>
            </div>
          </div>
        </div>

        {/* Right Sticky Sidebar: Summary & Estimated Cost */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-4 bg-console-surface border border-console-border rounded-lg p-5 shadow-lg space-y-4">
            <h4 className="font-semibold text-sm text-console-text border-b border-console-border pb-2.5">
              Summary
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-console-text-muted block text-[11px]">Software Image (AMI):</span>
                <span className="font-medium text-console-text">{selectedAmi.name}</span>
              </div>

              <div>
                <span className="text-console-text-muted block text-[11px]">Instance Type:</span>
                <span className="font-medium font-mono text-console-text">
                  {isCustomType ? 'Custom' : presetType} ({currentVcpus} vCPU, {(currentMemoryMb / 1024).toFixed(currentMemoryMb >= 1024 ? 0 : 1)} GB RAM)
                </span>
              </div>

              <div>
                <span className="text-console-text-muted block text-[11px]">Firewall (Security Group):</span>
                <span className="font-medium text-console-text">{selectedSgIds.join(', ')}</span>
              </div>

              <div>
                <span className="text-console-text-muted block text-[11px]">Storage (Volume):</span>
                <span className="font-medium text-console-text">
                  {storageSizeGb} GiB {storageType.toUpperCase()} SSD
                </span>
              </div>

              <div>
                <span className="text-console-text-muted block text-[11px]">Key Pair:</span>
                <span className="font-medium font-mono text-console-text">
                  {selectedKeyPairId
                    ? keyPairs.find((k) => k.id === selectedKeyPairId)?.name || selectedKeyPairId
                    : 'None (Insecure)'}
                </span>
              </div>
            </div>

            {/* Estimated Cost Section */}
            <div className="p-3 bg-console-surface-alt rounded-lg border border-console-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-console-text-secondary flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Estimated Monthly:
                </span>
                <span className="font-bold text-sm text-console-text font-mono">${totalMonthlyCost}</span>
              </div>
              <div className="text-[10px] text-console-text-muted">
                ~${computeHourly.toFixed(4)}/hr compute + storage
              </div>
            </div>

            {/* Launch CTA */}
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              onClick={handleLaunch}
              disabled={loading}
            >
              {loading ? 'Provisioning instance...' : 'Launch instance'}
            </Button>

            <p className="text-[10px] text-center text-console-text-muted">
              By launching, a Linux container micro-VM will be scheduled with resource quotas.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
