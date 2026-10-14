// components/instances/ConnectModal.tsx
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Tabs } from '../common/Tabs';
import { CopyButton } from '../common/CopyButton';
import { WebTerminal } from '../terminal/WebTerminal';
import { Terminal, Key, Shield, Info, ExternalLink } from 'lucide-react';
import type { Instance, KeyPair } from '@shared/types';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: Instance | null;
  keyPair?: KeyPair | null;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  instance,
  keyPair,
}) => {
  const [activeTab, setActiveTab] = useState<'ssh' | 'terminal'>('ssh');

  if (!instance) return null;

  let osUser = 'ubuntu';
  if (instance.amiId.includes('debian')) osUser = 'debian';
  if (instance.amiId.includes('alpine')) osUser = 'alpine';

  const hostIp = instance.publicIp || window.location.hostname || '127.0.0.1';
  const sshPort = instance.sshPort || 2201;
  const keyName = keyPair ? `${keyPair.name}.pem` : 'my-key-pair.pem';

  const chmodCmd = `chmod 400 ${keyName}`;
  const sshCmd = `ssh -i "${keyName}" -p ${sshPort} -o StrictHostKeyChecking=accept-new ${osUser}@${hostIp}`;
  const clearKnownHostCmd = `ssh-keygen -R "[${hostIp}]:${sshPort}"`;
  const fallbackSshCmd = `ssh -p ${sshPort} ${osUser}@${hostIp}`;

  let pkgMgrTip = 'sudo apt update && sudo apt install <package>';
  if (instance.amiId.includes('alpine')) pkgMgrTip = 'sudo apk update && sudo apk add <package>';

  const tabs = [
    { id: 'ssh', label: 'SSH Client' },
    { id: 'terminal', label: 'EC2 Instance Connect (Browser)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Connect to instance ${instance.name} (${instance.id})`}
      size="xl"
    >
      <div className="flex flex-col space-y-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

        {activeTab === 'ssh' ? (
          <div className="space-y-5 text-sm">
            <div className="p-3.5 bg-aws-blue/10 dark:bg-squid-900 border border-aws-blue/20 dark:border-squid-700 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-aws-teal shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-console-text-secondary">
                <span className="font-semibold text-console-text">Connection Details: </span>
                Instance public IP is <code className="font-mono text-aws-orange">{hostIp}</code>, user is <code className="font-mono text-emerald-400">{osUser}</code>, and SSH is mapped to host port <code className="font-mono text-aws-orange">{sshPort}</code>.
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-console-text">Step-by-step SSH connection instructions:</h4>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-console-text-muted flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  1. Locate and set private key permissions
                </label>
                <p className="text-xs text-console-text-secondary">
                  Open your terminal and ensure your private key file is not publicly viewable:
                </p>
                <div className="flex items-center justify-between p-2.5 bg-console-surface-alt border border-console-border rounded font-mono text-xs">
                  <span className="text-emerald-400 select-all">{chmodCmd}</span>
                  <CopyButton text={chmodCmd} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-console-text-muted flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  2. Connect using the SSH client
                </label>
                <p className="text-xs text-console-text-secondary">
                  Connect to your instance using its public IP address and the assigned port:
                </p>
                <div className="flex items-center justify-between p-2.5 bg-console-surface-alt border border-console-border rounded font-mono text-xs">
                  <span className="text-emerald-400 select-all">{sshCmd}</span>
                  <CopyButton text={sshCmd} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-console-text-muted">
                  If you see "REMOTE HOST IDENTIFICATION HAS CHANGED" (reused port):
                </label>
                <p className="text-xs text-console-text-secondary">
                  Clear the old host key fingerprint from your local known_hosts file:
                </p>
                <div className="flex items-center justify-between p-2.5 bg-console-surface-alt border border-console-border rounded font-mono text-xs">
                  <span className="text-amber-400 select-all">{clearKnownHostCmd}</span>
                  <CopyButton text={clearKnownHostCmd} />
                </div>
              </div>
            </div>

            <div className="p-3 bg-console-surface-alt/50 border border-console-border rounded text-xs space-y-1.5 text-console-text-secondary">
              <div className="font-semibold text-console-text">OS Details & Troubleshooting:</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Default OS user: <code className="font-mono text-console-text font-bold">{osUser}</code> (passwordless sudo enabled).</li>
                <li>Package manager command: <code className="font-mono text-emerald-400">{pkgMgrTip}</code></li>
                <li>Make sure you use the key pair selected at launch: <code className="font-mono text-console-text">{instance.keyPairId || 'None'}</code>.</li>
                <li>If connection times out, verify your Security Group allows inbound port {sshPort} from your client IP.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="h-[460px] flex flex-col">
            <WebTerminal instanceId={instance.id} />
          </div>
        )}
      </div>
    </Modal>
  );
};
