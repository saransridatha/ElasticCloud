// pages/AMIsPage.tsx
import React from 'react';
import { AMICatalog } from '../components/amis/AMICatalog';

interface AMIsPageProps {
  onLaunchAmi: (amiId: string) => void;
}

export const AMIsPage: React.FC<AMIsPageProps> = ({ onLaunchAmi }) => {
  return (
    <div className="h-full overflow-y-auto">
      <AMICatalog onLaunchAmi={onLaunchAmi} />
    </div>
  );
};
