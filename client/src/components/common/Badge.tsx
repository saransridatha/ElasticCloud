// components/common/Badge.tsx
import React from 'react';
import type { InstanceState, VolumeState } from '@shared/types';

interface BadgeProps {
  state: InstanceState | VolumeState | string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ state, size = 'md' }) => {
  const normalized = (state || '').toLowerCase();

  let bg = 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  let dot = 'bg-gray-400';
  let pulse = false;

  switch (normalized) {
    case 'running':
    case 'available':
      bg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      dot = 'bg-emerald-400';
      break;
    case 'pending':
    case 'creating':
      bg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      dot = 'bg-amber-400';
      pulse = true;
      break;
    case 'stopping':
    case 'shutting-down':
    case 'deleting':
      bg = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      dot = 'bg-orange-400';
      pulse = true;
      break;
    case 'stopped':
      bg = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      dot = 'bg-rose-400';
      break;
    case 'terminated':
    case 'deleted':
      bg = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      dot = 'bg-slate-500';
      break;
    case 'in-use':
      bg = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      dot = 'bg-blue-400';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border capitalize ${bg} ${sizeClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dot} ${pulse ? 'animate-pulse' : ''}`}
      />
      {state}
    </span>
  );
};
