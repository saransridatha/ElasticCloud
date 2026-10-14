// components/security-groups/SecurityGroupEditor.tsx
// Complete Security Group manager with Inbound/Outbound rules editors and rule modals

import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FirewallTester } from './FirewallTester';
import {
  Shield,
  Plus,
  Trash2,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Check,
} from 'lucide-react';
import type {
  SecurityGroup,
  SecurityGroupRule,
  RuleDirection,
  RuleProtocol,
  RuleAction,
  CreateSecurityGroupRequest,
} from '@shared/types';

interface SecurityGroupEditorProps {
  securityGroups: SecurityGroup[];
  selectedGroup: SecurityGroup | null;
  onSelectGroup: (id: string) => void;
  onCreateGroup: (req: CreateSecurityGroupRequest) => Promise<SecurityGroup>;
  onDeleteGroup: (id: string) => Promise<void>;
  onAddRule: (sgId: string, rule: Omit<SecurityGroupRule, 'id'>) => Promise<SecurityGroupRule>;
  onRemoveRule: (sgId: string, ruleId: string) => Promise<void>;
  onTestRule: (packet: any) => Promise<any>;
}

export const SecurityGroupEditor: React.FC<SecurityGroupEditorProps> = ({
  securityGroups,
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
  onAddRule,
  onRemoveRule,
  onTestRule,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Add rule modal state
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [ruleDirection, setRuleDirection] = useState<RuleDirection>('inbound');
  const [ruleTypePreset, setRuleTypePreset] = useState('SSH');
  const [ruleProtocol, setRuleProtocol] = useState<RuleProtocol>('tcp');
  const [rulePortRange, setRulePortRange] = useState('22');
  const [ruleCidr, setRuleCidr] = useState('0.0.0.0/0');
  const [ruleAction, setRuleAction] = useState<RuleAction>('ALLOW');
  const [ruleDescription, setRuleDescription] = useState('Allow SSH traffic');

  const [ruleToDelete, setRuleToDelete] = useState<{ sgId: string; ruleId: string } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  const handlePresetChange = (preset: string) => {
    setRuleTypePreset(preset);
    switch (preset) {
      case 'SSH':
        setRuleProtocol('tcp');
        setRulePortRange('22');
        setRuleDescription('Allow SSH access');
        break;
      case 'HTTP':
        setRuleProtocol('tcp');
        setRulePortRange('80');
        setRuleDescription('Allow HTTP web traffic');
        break;
      case 'HTTPS':
        setRuleProtocol('tcp');
        setRulePortRange('443');
        setRuleDescription('Allow HTTPS secure web traffic');
        break;
      case 'Custom TCP':
        setRuleProtocol('tcp');
        setRulePortRange('8000-8080');
        setRuleDescription('Custom TCP application ports');
        break;
      case 'Custom UDP':
        setRuleProtocol('udp');
        setRulePortRange('53');
        setRuleDescription('DNS or custom UDP');
        break;
      case 'All ICMP':
        setRuleProtocol('icmp');
        setRulePortRange('All');
        setRuleDescription('Allow ICMP ping requests');
        break;
      case 'All Traffic':
        setRuleProtocol('all');
        setRulePortRange('All');
        setRuleDescription('Allow all protocols and ports');
        break;
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await onCreateGroup({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || 'Custom Security Group',
    });
    setNewGroupName('');
    setNewGroupDesc('');
    setIsCreateModalOpen(false);
  };

  const handleAddRuleSubmit = async () => {
    if (!selectedGroup) return;
    await onAddRule(selectedGroup.id, {
      direction: ruleDirection,
      protocol: ruleProtocol,
      portRange: rulePortRange || 'All',
      cidr: ruleCidr || '0.0.0.0/0',
      action: ruleAction,
      description: ruleDescription,
      ruleType: ruleTypePreset,
    });
    setIsAddRuleModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 select-text">
      {/* Left List of Security Groups */}
      <div className="w-full lg:w-72 flex flex-col bg-console-surface border border-console-border rounded-lg overflow-hidden shrink-0 shadow-xs">
        <div className="p-3 border-b border-console-border bg-console-surface-alt/40 flex items-center justify-between">
          <span className="font-semibold text-xs text-console-text">Security Groups</span>
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create group
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-console-border">
          {securityGroups.map((sg) => {
            const isSelected = selectedGroup?.id === sg.id;
            return (
              <div
                key={sg.id}
                onClick={() => onSelectGroup(sg.id)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-aws-orange/10 border-l-4 border-l-aws-orange'
                    : 'hover:bg-console-surface-alt/50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-console-text">{sg.name}</span>
                  {sg.id === 'sg-default' && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-console-surface-alt text-console-text-muted">
                      Default
                    </span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-console-text-muted mt-0.5">{sg.id}</div>
                <div className="text-[11px] text-console-text-secondary mt-1 truncate">
                  {sg.description || 'No description'}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-console-text-muted">
                  <span>{sg.inboundRules.length} inbound</span>
                  <span>•</span>
                  <span>{sg.outboundRules.length} outbound</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Area: Selected Group Rules & Packet Simulator */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {selectedGroup ? (
          <>
            {/* Header info */}
            <div className="bg-console-surface border border-console-border rounded-lg p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-aws-orange" />
                    <h3 className="text-base font-bold text-console-text">{selectedGroup.name}</h3>
                    <span className="font-mono text-xs text-console-text-muted">({selectedGroup.id})</span>
                  </div>
                  <p className="text-xs text-console-text-secondary mt-1">{selectedGroup.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setRuleDirection('inbound');
                      setIsAddRuleModalOpen(true);
                    }}
                  >
                    Add rule
                  </Button>
                  {selectedGroup.id !== 'sg-default' && (
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => setGroupToDelete(selectedGroup.id)}
                    >
                      Delete group
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Inbound Rules Table */}
            <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-console-text uppercase tracking-wider flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  Inbound Rules ({selectedGroup.inboundRules.length})
                </h4>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="w-3 h-3" />}
                  onClick={() => {
                    setRuleDirection('inbound');
                    setIsAddRuleModalOpen(true);
                  }}
                >
                  Add inbound rule
                </Button>
              </div>

              <div className="border border-console-border rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-console-surface-alt/70 text-console-text-muted border-b border-console-border">
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Protocol</th>
                      <th className="p-2.5">Port Range</th>
                      <th className="p-2.5">Source CIDR</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-console-border font-mono text-[11px]">
                    {selectedGroup.inboundRules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-console-text-muted font-sans">
                          No inbound rules configured. All incoming traffic is blocked by default.
                        </td>
                      </tr>
                    ) : (
                      selectedGroup.inboundRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-console-surface-alt/30">
                          <td className="p-2.5 font-sans font-medium text-console-text">{rule.ruleType}</td>
                          <td className="p-2.5 uppercase">{rule.protocol}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-squid-800 text-gray-200">
                              {rule.portRange}
                            </span>
                          </td>
                          <td className="p-2.5 text-console-text-secondary">{rule.cidr}</td>
                          <td className="p-2.5">
                            <span className={rule.action === 'ALLOW' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {rule.action}
                            </span>
                          </td>
                          <td className="p-2.5 font-sans text-console-text-secondary">{rule.description}</td>
                          <td className="p-2.5 text-right font-sans">
                            <button
                              onClick={() => setRuleToDelete({ sgId: selectedGroup.id, ruleId: rule.id })}
                              className="text-console-text-muted hover:text-rose-500 p-1"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Outbound Rules Table */}
            <div className="bg-console-surface border border-console-border rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-console-text uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-blue-400" />
                  Outbound Rules ({selectedGroup.outboundRules.length})
                </h4>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="w-3 h-3" />}
                  onClick={() => {
                    setRuleDirection('outbound');
                    setIsAddRuleModalOpen(true);
                  }}
                >
                  Add outbound rule
                </Button>
              </div>

              <div className="border border-console-border rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-console-surface-alt/70 text-console-text-muted border-b border-console-border">
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Protocol</th>
                      <th className="p-2.5">Port Range</th>
                      <th className="p-2.5">Destination CIDR</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-console-border font-mono text-[11px]">
                    {selectedGroup.outboundRules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-console-text-muted font-sans">
                          No outbound rules configured. All outbound traffic is blocked by default.
                        </td>
                      </tr>
                    ) : (
                      selectedGroup.outboundRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-console-surface-alt/30">
                          <td className="p-2.5 font-sans font-medium text-console-text">{rule.ruleType}</td>
                          <td className="p-2.5 uppercase">{rule.protocol}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-squid-800 text-gray-200">
                              {rule.portRange}
                            </span>
                          </td>
                          <td className="p-2.5 text-console-text-secondary">{rule.cidr}</td>
                          <td className="p-2.5">
                            <span className={rule.action === 'ALLOW' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {rule.action}
                            </span>
                          </td>
                          <td className="p-2.5 font-sans text-console-text-secondary">{rule.description}</td>
                          <td className="p-2.5 text-right font-sans">
                            <button
                              onClick={() => setRuleToDelete({ sgId: selectedGroup.id, ruleId: rule.id })}
                              className="text-console-text-muted hover:text-rose-500 p-1"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Packet Simulator */}
            <FirewallTester securityGroup={selectedGroup} onTest={onTestRule} />
          </>
        ) : (
          <div className="p-12 text-center text-console-text-muted text-sm bg-console-surface border border-console-border rounded-lg">
            Select a security group from the left panel to inspect and edit rules.
          </div>
        )}
      </div>

      {/* Modal: Create Security Group */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Security Group"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateGroup}>
              Create Security Group
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-console-text block mb-1">Group name</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. web-dmz-firewall"
              className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text focus:outline-none focus:border-aws-orange text-sm"
            />
          </div>
          <div>
            <label className="font-semibold text-console-text block mb-1">Description</label>
            <textarea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="e.g. Inbound HTTP and SSH for web application tier"
              rows={3}
              className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text focus:outline-none focus:border-aws-orange text-sm"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Add Rule */}
      <Modal
        isOpen={isAddRuleModalOpen}
        onClose={() => setIsAddRuleModalOpen(false)}
        title={`Add ${ruleDirection === 'inbound' ? 'Inbound' : 'Outbound'} Rule`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddRuleSubmit}>
              Save Rule
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-console-text block mb-1">Direction</label>
              <select
                value={ruleDirection}
                onChange={(e) => setRuleDirection(e.target.value as RuleDirection)}
                className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text text-sm"
              >
                <option value="inbound">Inbound (Ingress)</option>
                <option value="outbound">Outbound (Egress)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-console-text block mb-1">Rule Preset Type</label>
              <select
                value={ruleTypePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text text-sm"
              >
                <option value="SSH">SSH (Port 22)</option>
                <option value="HTTP">HTTP (Port 80)</option>
                <option value="HTTPS">HTTPS (Port 443)</option>
                <option value="Custom TCP">Custom TCP</option>
                <option value="Custom UDP">Custom UDP</option>
                <option value="All ICMP">All ICMP - IPv4</option>
                <option value="All Traffic">All Traffic</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-console-text block mb-1">Protocol</label>
              <select
                value={ruleProtocol}
                onChange={(e) => setRuleProtocol(e.target.value as RuleProtocol)}
                className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text uppercase font-mono text-sm"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="icmp">ICMP</option>
                <option value="all">ALL</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-console-text block mb-1">Port Range</label>
              <input
                type="text"
                value={rulePortRange}
                onChange={(e) => setRulePortRange(e.target.value)}
                placeholder="22 or 8000-8080"
                className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text font-mono text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-console-text block mb-1">
                {ruleDirection === 'inbound' ? 'Source' : 'Destination'} CIDR
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={ruleCidr}
                  onChange={(e) => setRuleCidr(e.target.value)}
                  placeholder="0.0.0.0/0"
                  className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setRuleCidr('0.0.0.0/0')}
                  className="px-2 py-1 bg-console-surface border border-console-border rounded text-[10px] text-console-text-secondary hover:text-console-text whitespace-nowrap"
                  title="Anywhere"
                >
                  Any
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-console-text block mb-1">Action</label>
              <select
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value as RuleAction)}
                className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text font-medium text-sm"
              >
                <option value="ALLOW">ALLOW (Permit matching traffic)</option>
                <option value="DROP">DROP (Explicitly block matching traffic)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-console-text block mb-1">Rule Note / Description</label>
              <input
                type="text"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="e.g. Allow production bastion access"
                className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text text-sm"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm Rule Delete */}
      <ConfirmDialog
        isOpen={ruleToDelete !== null}
        onClose={() => setRuleToDelete(null)}
        onConfirm={() => {
          if (ruleToDelete) {
            onRemoveRule(ruleToDelete.sgId, ruleToDelete.ruleId);
          }
        }}
        title="Delete rule?"
        message="Are you sure you want to remove this security group rule? Traffic matching this rule will immediately fall back to default policy."
        confirmText="Delete"
        isDanger={true}
      />

      {/* Confirm Group Delete */}
      <ConfirmDialog
        isOpen={groupToDelete !== null}
        onClose={() => setGroupToDelete(null)}
        onConfirm={() => {
          if (groupToDelete) {
            onDeleteGroup(groupToDelete);
          }
        }}
        title="Delete security group?"
        message="Are you sure you want to delete this security group? This cannot be undone."
        confirmText="Delete Group"
        isDanger={true}
      />
    </div>
  );
};
