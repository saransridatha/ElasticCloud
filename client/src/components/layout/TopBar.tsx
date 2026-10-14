// components/layout/TopBar.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Globe,
  Sun,
  Moon,
  Search,
  User,
  ExternalLink,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export const TopBar: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();

  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/':
        return 'EC2 Dashboard';
      case '/instances':
        return 'Instances';
      case '/amis':
        return 'AMIs (Amazon Machine Images)';
      case '/security-groups':
        return 'Security Groups';
      case '/keypairs':
        return 'Key Pairs';
      case '/volumes':
        return 'Elastic Block Store > Volumes';
      default:
        return 'EC2 Console';
    }
  };

  return (
    <header className="h-14 bg-squid-900 border-b border-squid-800 text-white flex items-center justify-between px-4 z-20 shrink-0">
      {/* Left: Breadcrumbs & Quick Service Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-200">
          <span className="text-gray-400">AWS</span>
          <span className="text-gray-500">/</span>
          <span className="text-aws-orange">EC2</span>
          <span className="text-gray-500">/</span>
          <span className="text-white">{getBreadcrumb()}</span>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center relative w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search resources, services, docs..."
            className="w-full pl-8 pr-3 py-1 text-xs bg-squid-950 border border-squid-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-aws-orange transition-colors"
          />
        </div>
      </div>

      {/* Right Controls: CloudShell, Region Selector, Theme Toggle, Account */}
      <div className="flex items-center gap-3">
        {/* Region Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-squid-950 border border-squid-700 text-xs font-mono text-gray-300">
          <Globe className="w-3.5 h-3.5 text-aws-teal" />
          <span>us-east-1</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400 text-[11px]">nimbus-local-1a</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-squid-800 transition-colors"
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-300" />}
        </button>

        {/* Account Info */}
        <div className="flex items-center gap-2 pl-2 border-l border-squid-700">
          <div className="w-7 h-7 rounded-full bg-squid-700 flex items-center justify-center text-aws-orange">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-medium text-gray-200">root@account</span>
            <span className="text-[10px] text-gray-400 font-mono">1289-4091-8842</span>
          </div>
        </div>
      </div>
    </header>
  );
};
