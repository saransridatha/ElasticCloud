// hooks/useDashboard.ts
import { useState, useEffect, useCallback } from 'react';
import type { DashboardSummary } from '@shared/types';
import { fetchDashboard } from '../api/client';

export function useDashboard(pollIntervalMs = 6000) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await fetchDashboard();
      setSummary(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard summary');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const timer = setInterval(() => load(false), pollIntervalMs);
    return () => clearInterval(timer);
  }, [load, pollIntervalMs]);

  return { summary, loading, error, refresh: () => load(false) };
}
