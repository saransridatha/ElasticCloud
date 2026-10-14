// pages/VolumesPage.tsx
import React from 'react';
import { VolumeList } from '../components/volumes/VolumeList';
import { useVolumes } from '../hooks/useVolumes';

export const VolumesPage: React.FC = () => {
  const { volumes, refresh, loading } = useVolumes();

  return (
    <div className="h-full overflow-hidden">
      <VolumeList volumes={volumes} onRefresh={refresh} loading={loading} />
    </div>
  );
};
