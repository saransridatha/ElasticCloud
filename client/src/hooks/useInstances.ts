// hooks/useInstances.ts
import { useState, useEffect, useCallback } from 'react';
import type { Instance, LaunchInstanceRequest } from '@shared/types';
import {
  fetchInstances,
  launchInstance as apiLaunchInstance,
  controlInstance as apiControlInstance,
  updateInstance as apiUpdateInstance,
} from '../api/client';

export function useInstances(pollIntervalMs = 4000) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInstances = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await fetchInstances();
      setInstances(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch instances');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances(true);
    const timer = setInterval(() => {
      loadInstances(false);
    }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [loadInstances, pollIntervalMs]);

  const launch = async (req: LaunchInstanceRequest): Promise<Instance> => {
    const inst = await apiLaunchInstance(req);
    await loadInstances(false);
    return inst;
  };

  const control = async (id: string, action: 'start' | 'stop' | 'reboot' | 'terminate'): Promise<Instance> => {
    // Optimistic UI update
    setInstances((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          if (action === 'start') return { ...i, state: 'pending' };
          if (action === 'stop') return { ...i, state: 'stopping' };
          if (action === 'reboot') return { ...i, state: 'stopping' };
          if (action === 'terminate') return { ...i, state: 'shutting-down' };
        }
        return i;
      })
    );

    const res = await apiControlInstance(id, action);
    await loadInstances(false);
    return res;
  };

  const update = async (id: string, data: Partial<Pick<Instance, 'name' | 'tags'>>): Promise<Instance> => {
    const res = await apiUpdateInstance(id, data);
    await loadInstances(false);
    return res;
  };

  return {
    instances,
    loading,
    error,
    refresh: () => loadInstances(false),
    launch,
    control,
    update,
  };
}
