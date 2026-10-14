// pages/SecurityGroupsPage.tsx
import React from 'react';
import { SecurityGroupEditor } from '../components/security-groups/SecurityGroupEditor';
import { useSecurityGroups } from '../hooks/useSecurityGroups';

export const SecurityGroupsPage: React.FC = () => {
  const {
    securityGroups,
    selectedGroup,
    selectGroup,
    create,
    addRule,
    removeRule,
    removeGroup,
    testRule,
  } = useSecurityGroups();

  return (
    <div className="h-full p-6 overflow-hidden">
      <SecurityGroupEditor
        securityGroups={securityGroups}
        selectedGroup={selectedGroup}
        onSelectGroup={selectGroup}
        onCreateGroup={create}
        onDeleteGroup={removeGroup}
        onAddRule={addRule}
        onRemoveRule={removeRule}
        onTestRule={testRule}
      />
    </div>
  );
};
