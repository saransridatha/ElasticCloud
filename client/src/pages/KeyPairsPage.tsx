// pages/KeyPairsPage.tsx
import React from 'react';
import { KeyPairManager } from '../components/keypairs/KeyPairManager';
import { useKeyPairs } from '../hooks/useKeyPairs';

export const KeyPairsPage: React.FC = () => {
  const { keyPairs, create, importKey, remove, refresh, loading } = useKeyPairs();

  return (
    <div className="h-full overflow-hidden">
      <KeyPairManager
        keyPairs={keyPairs}
        onCreate={create}
        onImport={importKey}
        onDelete={remove}
        onRefresh={refresh}
        loading={loading}
      />
    </div>
  );
};
