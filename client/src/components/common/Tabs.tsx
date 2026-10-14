// components/common/Tabs.tsx
import React from 'react';

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex border-b border-console-border ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 select-none -mb-px ${
              isActive
                ? 'border-aws-orange text-aws-orange'
                : 'border-transparent text-console-text-secondary hover:text-console-text hover:border-console-border'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-aws-orange/15 text-aws-orange'
                    : 'bg-console-surface-alt text-console-text-secondary'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
