// hooks/useSecurityGroups.ts
import { useState, useEffect, useCallback } from 'react';
import type {
  SecurityGroup,
  SecurityGroupRule,
  CreateSecurityGroupRequest,
  FirewallTestRequest,
  FirewallTestResult,
} from '@shared/types';
import {
  fetchSecurityGroups,
  fetchSecurityGroup,
  createSecurityGroup as apiCreateSecurityGroup,
  addSecurityGroupRule as apiAddRule,
  removeSecurityGroupRule as apiRemoveRule,
  deleteSecurityGroup as apiDeleteSecurityGroup,
  testFirewall as apiTestFirewall,
} from '../api/client';

export function useSecurityGroups() {
  const [securityGroups, setSecurityGroups] = useState<SecurityGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SecurityGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchSecurityGroups();
      setSecurityGroups(data);
      if (data.length > 0) {
        setSelectedGroup((prev) => {
          if (!prev) return data[0];
          const matched = data.find((g) => g.id === prev.id);
          return matched || data[0];
        });
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch security groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectGroup = async (id: string) => {
    try {
      const sg = await fetchSecurityGroup(id);
      setSelectedGroup(sg);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const create = async (req: CreateSecurityGroupRequest): Promise<SecurityGroup> => {
    const res = await apiCreateSecurityGroup(req);
    await load();
    setSelectedGroup(res);
    return res;
  };

  const addRule = async (sgId: string, rule: Omit<SecurityGroupRule, 'id'>): Promise<SecurityGroupRule> => {
    const res = await apiAddRule(sgId, rule);
    await load();
    if (selectedGroup && selectedGroup.id === sgId) {
      await selectGroup(sgId);
    }
    return res;
  };

  const removeRule = async (sgId: string, ruleId: string): Promise<void> => {
    await apiRemoveRule(sgId, ruleId);
    await load();
    if (selectedGroup && selectedGroup.id === sgId) {
      await selectGroup(sgId);
    }
  };

  const removeGroup = async (id: string): Promise<void> => {
    await apiDeleteSecurityGroup(id);
    await load();
  };

  const testRule = async (req: FirewallTestRequest): Promise<FirewallTestResult> => {
    return apiTestFirewall(req);
  };

  return {
    securityGroups,
    selectedGroup,
    selectGroup,
    loading,
    error,
    refresh: load,
    create,
    addRule,
    removeRule,
    removeGroup,
    testRule,
  };
}
