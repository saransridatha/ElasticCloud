// hooks/useKeyPairs.ts
import { useState, useEffect, useCallback } from 'react';
import type { KeyPair, CreateKeyPairRequest, CreateKeyPairResponse, ImportKeyPairRequest } from '@shared/types';
import {
  fetchKeyPairs,
  createKeyPair as apiCreateKeyPair,
  importKeyPair as apiImportKeyPair,
  deleteKeyPair as apiDeleteKeyPair,
} from '../api/client';

export function useKeyPairs() {
  const [keyPairs, setKeyPairs] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchKeyPairs();
      setKeyPairs(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch key pairs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (req: CreateKeyPairRequest): Promise<CreateKeyPairResponse> => {
    const res = await apiCreateKeyPair(req);
    await load();
    return res;
  };

  const importKey = async (req: ImportKeyPairRequest): Promise<KeyPair> => {
    const res = await apiImportKeyPair(req);
    await load();
    return res;
  };

  const remove = async (id: string): Promise<void> => {
    await apiDeleteKeyPair(id);
    await load();
  };

  return {
    keyPairs,
    loading,
    error,
    refresh: load,
    create,
    importKey,
    remove,
  };
}
