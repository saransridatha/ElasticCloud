// pages/InstancesPage.tsx
// Main EC2 Instances management page with resizable bottom split-pane inspector and wizard

import React, { useState } from 'react';
import { InstanceTable } from '../components/instances/InstanceTable';
import { InstanceDetails } from '../components/instances/InstanceDetails';
import { SplitPane } from '../components/common/SplitPane';
import { ConnectModal } from '../components/instances/ConnectModal';
import { LaunchWizard } from '../components/launch-wizard/LaunchWizard';
import { useInstances } from '../hooks/useInstances';
import { useKeyPairs } from '../hooks/useKeyPairs';
import { useSecurityGroups } from '../hooks/useSecurityGroups';
import type { Instance } from '@shared/types';

interface InstancesPageProps {
  isLaunchWizardOpen: boolean;
  onCloseLaunchWizard: () => void;
  onOpenLaunchWizard: () => void;
}

export const InstancesPage: React.FC<InstancesPageProps> = ({
  isLaunchWizardOpen,
  onCloseLaunchWizard,
  onOpenLaunchWizard,
}) => {
  const { instances, loading, refresh, launch, control } = useInstances(4000);
  const { keyPairs } = useKeyPairs();
  const { securityGroups } = useSecurityGroups();

  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [connectInstance, setConnectInstance] = useState<Instance | null>(null);

  // Sync selected instance when instances update
  const currentSelected = selectedInstance
    ? instances.find((i) => i.id === selectedInstance.id) || null
    : null;

  const connectedKeyPair = connectInstance
    ? keyPairs.find((k) => k.id === connectInstance.keyPairId) || null
    : null;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <SplitPane
        isOpen={currentSelected !== null}
        onClose={() => setSelectedInstance(null)}
        defaultHeight={42}
        top={
          <InstanceTable
            instances={instances}
            selectedInstance={currentSelected}
            onSelectInstance={(inst) => setSelectedInstance(inst)}
            onLaunchClick={onOpenLaunchWizard}
            onConnectClick={(inst) => setConnectInstance(inst)}
            onAction={async (id, action) => {
              await control(id, action);
            }}
            onRefresh={refresh}
            loading={loading}
          />
        }
        bottom={
          currentSelected ? (
            <InstanceDetails
              instance={currentSelected}
              onClose={() => setSelectedInstance(null)}
              onConnectClick={() => setConnectInstance(currentSelected)}
            />
          ) : null
        }
      />

      {/* Connect Modal */}
      <ConnectModal
        isOpen={connectInstance !== null}
        onClose={() => setConnectInstance(null)}
        instance={connectInstance}
        keyPair={connectedKeyPair}
      />

      {/* Launch Wizard Modal */}
      <LaunchWizard
        isOpen={isLaunchWizardOpen}
        onClose={onCloseLaunchWizard}
        onLaunch={async (req) => {
          const newInst = await launch(req);
          setSelectedInstance(newInst);
        }}
        keyPairs={keyPairs}
        securityGroups={securityGroups}
      />
    </div>
  );
};
