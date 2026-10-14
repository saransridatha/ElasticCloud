// components/instances/StateDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, RotateCw, Trash2, ChevronDown } from 'lucide-react';
import type { Instance } from '@shared/types';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface StateDropdownProps {
  instance: Instance | null;
  onAction: (id: string, action: 'start' | 'stop' | 'reboot' | 'terminate') => Promise<void>;
  disabled?: boolean;
}

export const StateDropdown: React.FC<StateDropdownProps> = ({ instance, onAction, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'stop' | 'reboot' | 'terminate' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!instance) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-console-surface text-console-text-muted border border-console-border rounded opacity-50 cursor-not-allowed"
      >
        <span>Instance state</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  const isRunning = instance.state === 'running';
  const isStopped = instance.state === 'stopped';
  const isTerminated = instance.state === 'terminated';

  const handleSelect = (action: 'start' | 'stop' | 'reboot' | 'terminate') => {
    setIsOpen(false);
    if (action === 'start') {
      onAction(instance.id, 'start');
    } else {
      setConfirmAction(action);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isTerminated}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-console-surface text-console-text border border-console-border rounded hover:bg-console-surface-alt active:bg-console-border transition-colors disabled:opacity-50 shadow-xs"
      >
        <span>Instance state</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-md bg-console-surface border border-console-border shadow-xl z-50 py-1 animate-fade-in">
          <button
            onClick={() => handleSelect('start')}
            disabled={!isStopped}
            className="w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5 text-console-text hover:bg-console-surface-alt disabled:opacity-40 disabled:pointer-events-none"
          >
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Start instance</span>
          </button>
          <button
            onClick={() => handleSelect('stop')}
            disabled={!isRunning}
            className="w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5 text-console-text hover:bg-console-surface-alt disabled:opacity-40 disabled:pointer-events-none"
          >
            <Square className="w-4 h-4 text-amber-400" />
            <span>Stop instance</span>
          </button>
          <button
            onClick={() => handleSelect('reboot')}
            disabled={!isRunning}
            className="w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5 text-console-text hover:bg-console-surface-alt disabled:opacity-40 disabled:pointer-events-none"
          >
            <RotateCw className="w-4 h-4 text-blue-400" />
            <span>Reboot instance</span>
          </button>
          <div className="border-t border-console-border my-1" />
          <button
            onClick={() => handleSelect('terminate')}
            disabled={isTerminated}
            className="w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5 text-rose-500 hover:bg-rose-500/10 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Terminate instance</span>
          </button>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmAction === 'stop'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => onAction(instance.id, 'stop')}
        title="Stop instance?"
        message={`Are you sure you want to stop instance ${instance.name} (${instance.id})? Any ephemeral container state will be suspended.`}
        confirmText="Stop"
        isDanger={false}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'reboot'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => onAction(instance.id, 'reboot')}
        title="Reboot instance?"
        message={`Are you sure you want to reboot instance ${instance.name} (${instance.id})? The operating system will perform a graceful reboot.`}
        confirmText="Reboot"
        isDanger={false}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'terminate'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => onAction(instance.id, 'terminate')}
        title="Terminate instance?"
        message={`Are you sure you want to terminate instance ${instance.name} (${instance.id})? This action is irreversible. The root EBS volume (${instance.volumeId}) will ${
          instance.deleteStorageOnTermination ? 'be DELETED permanently' : 'remain available'
        }.`}
        confirmText="Terminate"
        isDanger={true}
      />
    </div>
  );
};
