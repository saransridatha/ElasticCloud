// components/keypairs/KeyPairManager.tsx
// SSH Key Pair management with instant browser .pem download and public key import

import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SearchInput } from '../common/SearchInput';
import { CopyButton } from '../common/CopyButton';
import {
  Key,
  Plus,
  Upload,
  Trash2,
  Download,
  CheckCircle,
  FileText,
  Shield,
} from 'lucide-react';
import type {
  KeyPair,
  KeyPairType,
  CreateKeyPairRequest,
  CreateKeyPairResponse,
  ImportKeyPairRequest,
} from '@shared/types';

interface KeyPairManagerProps {
  keyPairs: KeyPair[];
  onCreate: (req: CreateKeyPairRequest) => Promise<CreateKeyPairResponse>;
  onImport: (req: ImportKeyPairRequest) => Promise<KeyPair>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
  loading?: boolean;
}

export const KeyPairManager: React.FC<KeyPairManagerProps> = ({
  keyPairs,
  onCreate,
  onImport,
  onDelete,
  onRefresh,
  loading = false,
}) => {
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<KeyPairType>('rsa');

  // Import form state
  const [importName, setImportName] = useState('');
  const [importPublicKey, setImportPublicKey] = useState('');

  // Delete state
  const [keyToDelete, setKeyToDelete] = useState<KeyPair | null>(null);

  // Success alert after creation
  const [createdKeyInfo, setCreatedKeyInfo] = useState<{ name: string; fingerprint: string } | null>(null);

  const filteredKeys = keyPairs.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.fingerprint.toLowerCase().includes(search.toLowerCase()) ||
      k.type.toLowerCase().includes(search.toLowerCase())
  );

  const downloadPemFile = (keyName: string, privateKeyPem: string) => {
    const blob = new Blob([privateKeyPem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${keyName}.pem`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateSubmit = async () => {
    if (!createName.trim()) return;
    try {
      const res = await onCreate({
        name: createName.trim(),
        type: createType,
      });

      // Automatically trigger browser download of the private .pem file
      downloadPemFile(res.keyPair.name, res.privateKey);

      setCreatedKeyInfo({
        name: res.keyPair.name,
        fingerprint: res.keyPair.fingerprint,
      });

      setCreateName('');
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(`Error creating key pair: ${err.message}`);
    }
  };

  const handleImportSubmit = async () => {
    if (!importName.trim() || !importPublicKey.trim()) return;
    try {
      await onImport({
        name: importName.trim(),
        publicKey: importPublicKey.trim(),
      });
      setImportName('');
      setImportPublicKey('');
      setIsImportModalOpen(false);
    } catch (err: any) {
      alert(`Error importing key pair: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-console-surface text-console-text select-text">
      {/* Top Banner Notice if Key Just Created */}
      {createdKeyInfo && (
        <div className="m-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start justify-between animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-emerald-200">
                Key pair '{createdKeyInfo.name}' created and downloaded successfully!
              </span>
              <p className="text-emerald-300/90 leading-relaxed">
                Your private key file <code className="font-mono bg-black/20 px-1 py-0.5 rounded">{createdKeyInfo.name}.pem</code> has been downloaded to your computer.
                Make sure to store it securely: <code className="font-mono bg-black/20 px-1 py-0.5 rounded">chmod 400 {createdKeyInfo.name}.pem</code>.
              </p>
              <div className="font-mono text-[10px] text-emerald-400/80">
                Fingerprint: {createdKeyInfo.fingerprint}
              </div>
            </div>
          </div>
          <button
            onClick={() => setCreatedKeyInfo(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="p-3 border-b border-console-border bg-console-surface-alt/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create key pair
          </Button>
          <Button
            variant="secondary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import key pair
          </Button>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search key pairs..."
          className="w-64"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-console-surface-alt/80 text-console-text-muted sticky top-0 border-b border-console-border backdrop-blur-xs select-none">
            <tr>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Fingerprint (SHA256)</th>
              <th className="p-3 font-semibold">Instances</th>
              <th className="p-3 font-semibold">Created Date</th>
              <th className="p-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-console-border">
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-console-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Key className="w-8 h-8 opacity-40" />
                    <p className="font-medium text-sm">No key pairs found</p>
                    <p className="text-xs">Create or import an SSH key pair to connect to instances.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredKeys.map((kp) => (
                <tr key={kp.id} className="hover:bg-console-surface-alt/40 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2 font-semibold text-console-text">
                      <Key className="w-4 h-4 text-aws-orange shrink-0" />
                      <span>{kp.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-console-surface-alt text-console-text-secondary border border-console-border">
                      {kp.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-console-text-secondary">
                    <div className="flex items-center gap-1">
                      <span>{kp.fingerprint}</span>
                      <CopyButton text={kp.fingerprint} />
                    </div>
                  </td>
                  <td className="p-3 font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-console-surface-alt text-console-text text-xs">
                      {kp.instanceCount || 0}
                    </span>
                  </td>
                  <td className="p-3 text-console-text-muted whitespace-nowrap">
                    {new Date(kp.createdAt).toLocaleDateString()} {new Date(kp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setKeyToDelete(kp)}
                      className="p-1 rounded text-console-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete key pair"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Key Pair */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create key pair"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit}>
              Create and Download .pem
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-console-text block mb-1">Key pair name</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. prod-bastion-key"
              className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text focus:outline-none focus:border-aws-orange text-sm font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-console-text block mb-1">Key pair type</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded border border-console-border bg-console-surface-alt/40 cursor-pointer">
                <input
                  type="radio"
                  name="keytype"
                  checked={createType === 'rsa'}
                  onChange={() => setCreateType('rsa')}
                  className="mt-0.5 accent-aws-orange"
                />
                <div>
                  <span className="font-semibold text-console-text block">RSA</span>
                  <span className="text-console-text-secondary text-[11px]">
                    2048-bit RSA encryption. Supported by all legacy and modern SSH clients.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded border border-console-border bg-console-surface-alt/40 cursor-pointer">
                <input
                  type="radio"
                  name="keytype"
                  checked={createType === 'ed25519'}
                  onChange={() => setCreateType('ed25519')}
                  className="mt-0.5 accent-aws-orange"
                />
                <div>
                  <span className="font-semibold text-console-text block">ED25519</span>
                  <span className="text-console-text-secondary text-[11px]">
                    Modern Edwards-curve Digital Signature Algorithm. Faster and highly secure.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="p-3 bg-console-surface-alt rounded border border-console-border text-console-text-secondary text-[11px] leading-relaxed">
            <span className="font-semibold text-console-text">Note: </span>
            The private key file will download automatically as <code className="font-mono text-aws-orange">&lt;name&gt;.pem</code>.
            ElasticCloud does NOT store your private key.
          </div>
        </div>
      </Modal>

      {/* Modal: Import Key Pair */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import key pair"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleImportSubmit}>
              Import Public Key
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-console-text block mb-1">Key pair name</label>
            <input
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder="e.g. my-imported-id_rsa"
              className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text focus:outline-none focus:border-aws-orange text-sm font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-console-text block mb-1">Public key contents</label>
            <p className="text-[11px] text-console-text-secondary mb-1">
              Paste the contents of your public key file (e.g. <code className="font-mono">~/.ssh/id_rsa.pub</code> or <code className="font-mono">id_ed25519.pub</code>):
            </p>
            <textarea
              value={importPublicKey}
              onChange={(e) => setImportPublicKey(e.target.value)}
              placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... user@host"
              rows={5}
              className="w-full px-3 py-2 bg-console-surface-alt border border-console-border rounded text-console-text font-mono text-xs focus:outline-none focus:border-aws-orange"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Delete */}
      <ConfirmDialog
        isOpen={keyToDelete !== null}
        onClose={() => setKeyToDelete(null)}
        onConfirm={() => {
          if (keyToDelete) onDelete(keyToDelete.id);
        }}
        title="Delete key pair?"
        message={`Are you sure you want to delete key pair '${keyToDelete?.name}'? Instances launched with this key pair will still accept it, but it will be removed from your console.`}
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
};
