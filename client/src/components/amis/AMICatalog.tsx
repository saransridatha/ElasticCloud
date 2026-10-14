// components/amis/AMICatalog.tsx
// AMI Catalog view with Quick Start OS cards and direct launch action

import React from 'react';
import { Button } from '../common/Button';
import { Layers, Rocket, Check, Terminal, Shield, HardDrive } from 'lucide-react';
import { AVAILABLE_AMIS, type AMI } from '@shared/types';

interface AMICatalogProps {
  onLaunchAmi: (amiId: string) => void;
}

export const AMICatalog: React.FC<AMICatalogProps> = ({ onLaunchAmi }) => {
  return (
    <div className="p-6 space-y-6 max-w-6xl select-text">
      <div>
        <h3 className="text-lg font-bold text-console-text flex items-center gap-2">
          <Layers className="w-5 h-5 text-aws-orange" />
          Amazon Machine Images (AMIs)
        </h3>
        <p className="text-xs text-console-text-secondary mt-1">
          An AMI is a template that contains the software configuration (operating system, application server, and applications) required to launch your instance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {AVAILABLE_AMIS.map((ami) => {
          const isUbuntu = ami.icon === 'ubuntu';
          const isDebian = ami.icon === 'debian';

          return (
            <div
              key={ami.id}
              className="bg-console-surface border border-console-border rounded-lg p-5 flex flex-col justify-between shadow-xs hover:border-aws-orange transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-4xl">
                    {isUbuntu ? '🐧' : isDebian ? '🌀' : '🏔️'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Verified AMI
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-console-text">{ami.name}</h4>
                  <div className="font-mono text-[11px] text-aws-orange mt-0.5">{ami.id}</div>
                  <p className="text-xs text-console-text-secondary mt-2 leading-relaxed">
                    {ami.description}
                  </p>
                </div>

                {/* Pre-installed components */}
                <div className="space-y-2 pt-2 border-t border-console-border">
                  <span className="text-[11px] font-semibold text-console-text-muted uppercase tracking-wider block">
                    Pre-installed Packages
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-console-text-secondary font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>openssh-server</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>iptables firewall</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>iproute2 net</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>sudo privileges</span>
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="p-3 bg-console-surface-alt rounded border border-console-border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-console-text-secondary">Default User:</span>
                    <span className="font-mono font-medium text-console-text">{ami.defaultUser}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-console-text-secondary">Architecture:</span>
                    <span className="font-mono text-console-text">{ami.arch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-console-text-secondary">Root Device:</span>
                    <span className="font-mono text-console-text">{ami.rootDeviceName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-console-border">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  icon={<Rocket className="w-4 h-4" />}
                  onClick={() => onLaunchAmi(ami.id)}
                >
                  Launch Instance with this AMI
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
