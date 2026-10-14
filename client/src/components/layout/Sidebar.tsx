// components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Layers,
  ShieldAlert,
  Key,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  Cloud,
} from 'lucide-react';
import { useInstances } from '../../hooks/useInstances';
import { useVolumes } from '../../hooks/useVolumes';
import { useSecurityGroups } from '../../hooks/useSecurityGroups';
import { useKeyPairs } from '../../hooks/useKeyPairs';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const { instances } = useInstances(10000);
  const { volumes } = useVolumes();
  const { securityGroups } = useSecurityGroups();
  const { keyPairs } = useKeyPairs();

  const runningCount = instances.filter((i) => i.state === 'running').length;

  const navGroups = [
    {
      title: 'Compute',
      items: [
        { name: 'Dashboard', to: '/', icon: LayoutDashboard },
        { name: 'Instances', to: '/instances', icon: Server, badge: instances.length },
        { name: 'AMIs / OS Images', to: '/amis', icon: Layers, badge: 3 },
      ],
    },
    {
      title: 'Network & Security',
      items: [
        { name: 'Security Groups', to: '/security-groups', icon: ShieldAlert, badge: securityGroups.length },
        { name: 'Key Pairs', to: '/keypairs', icon: Key, badge: keyPairs.length },
      ],
    },
    {
      title: 'Elastic Block Store',
      items: [
        { name: 'Volumes', to: '/volumes', icon: HardDrive, badge: volumes.length },
      ],
    },
  ];

  return (
    <aside
      className={`h-screen bg-console-surface border-r border-console-border flex flex-col transition-all duration-200 select-none z-30 shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-console-border bg-squid-950 text-white">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-aws-orange to-amber-600 flex items-center justify-center shrink-0 shadow-sm">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-wide text-white">ElasticCloud</span>
              <span className="text-[10px] text-gray-400 font-mono">EC2 Orchestrator</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title} className="px-2">
            {!collapsed && (
              <h4 className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-console-text-muted">
                {group.title}
              </h4>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded transition-colors group relative ${
                      isActive
                        ? 'bg-aws-orange/10 text-aws-orange border-l-3 border-aws-orange'
                        : 'text-console-text-secondary hover:text-console-text hover:bg-console-surface-alt'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate flex-1">{item.name}</span>}
                  {!collapsed && item.badge !== undefined && (
                    <span className="text-xs px-1.5 py-0.2 rounded-full bg-console-surface-alt text-console-text-secondary font-mono">
                      {item.badge}
                    </span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-squid-900 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 border-t border-console-border bg-console-surface-alt/30 text-xs text-console-text-muted flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{runningCount} Running Instances</span>
          </div>
          <span className="font-mono text-[10px]">v1.0.0</span>
        </div>
      )}
    </aside>
  );
};
