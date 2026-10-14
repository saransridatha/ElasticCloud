// App.tsx
// Main Application Layout and Navigation Router

import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardPage } from './pages/DashboardPage';
import { InstancesPage } from './pages/InstancesPage';
import { SecurityGroupsPage } from './pages/SecurityGroupsPage';
import { KeyPairsPage } from './pages/KeyPairsPage';
import { VolumesPage } from './pages/VolumesPage';
import { AMIsPage } from './pages/AMIsPage';
import { LaunchWizard } from './components/launch-wizard/LaunchWizard';
import { useInstances } from './hooks/useInstances';
import { useKeyPairs } from './hooks/useKeyPairs';
import { useSecurityGroups } from './hooks/useSecurityGroups';

export const App: React.FC = () => {
  const navigate = useNavigate();
  const [isLaunchWizardOpen, setIsLaunchWizardOpen] = useState(false);
  const [launchAmiId, setLaunchAmiId] = useState<string | undefined>(undefined);

  const { launch } = useInstances(10000);
  const { keyPairs } = useKeyPairs();
  const { securityGroups } = useSecurityGroups();

  const handleLaunchFromAmi = (amiId: string) => {
    setLaunchAmiId(amiId);
    setIsLaunchWizardOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-console-bg text-console-text">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  onOpenLaunchWizard={() => {
                    setLaunchAmiId(undefined);
                    setIsLaunchWizardOpen(true);
                  }}
                />
              }
            />
            <Route
              path="/instances"
              element={
                <InstancesPage
                  isLaunchWizardOpen={isLaunchWizardOpen}
                  onCloseLaunchWizard={() => setIsLaunchWizardOpen(false)}
                  onOpenLaunchWizard={() => {
                    setLaunchAmiId(undefined);
                    setIsLaunchWizardOpen(true);
                  }}
                />
              }
            />
            <Route path="/security-groups" element={<SecurityGroupsPage />} />
            <Route path="/keypairs" element={<KeyPairsPage />} />
            <Route path="/volumes" element={<VolumesPage />} />
            <Route path="/amis" element={<AMIsPage onLaunchAmi={handleLaunchFromAmi} />} />
          </Routes>
        </main>
      </div>

      {/* Global Launch Wizard (if invoked from Dashboard or AMIs page) */}
      <LaunchWizard
        isOpen={isLaunchWizardOpen}
        onClose={() => {
          setIsLaunchWizardOpen(false);
          setLaunchAmiId(undefined);
        }}
        onLaunch={async (req) => {
          await launch(req);
          navigate('/instances');
        }}
        keyPairs={keyPairs}
        securityGroups={securityGroups}
        initialAmiId={launchAmiId}
      />
    </div>
  );
};

export default App;
