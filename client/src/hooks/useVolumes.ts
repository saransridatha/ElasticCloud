// hooks/useVolumes.ts
import { useState, useEffect, useCallback } from 'react';
import type { Volume } from '@shared/types';
import { fetchVolumes } from '../api/client';

export function useVolumes() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchVolumes();
      setVolumes(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch volumes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { volumes, loading, error, refresh: load };
}
