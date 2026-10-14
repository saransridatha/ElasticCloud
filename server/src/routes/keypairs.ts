// routes/keypairs.ts
// SSH Key Pair management: creation, public key import, and deletion

import { Router, Request, Response } from 'express';
import {
  getAllKeyPairs,
  getKeyPairById,
  getKeyPairByName,
  createKeyPair,
  deleteKeyPair,
} from '../db';
import { KeyManager } from '../services/key-manager';
import { generateKeyPairId } from '../services/id-generator';
import type {
  CreateKeyPairRequest,
  CreateKeyPairResponse,
  ImportKeyPairRequest,
  KeyPair,
} from '@shared/types';

export const keyPairsRouter = Router();

// GET /api/keypairs – list all key pairs
keyPairsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const keyPairs = getAllKeyPairs();
    res.json({ success: true, data: keyPairs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/keypairs/:id – get single key pair
keyPairsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const kp = getKeyPairById((req.params.id as string));
    if (!kp) return res.status(404).json({ success: false, error: 'Key pair not found' });
    res.json({ success: true, data: kp });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/keypairs – generate new key pair (RSA or Ed25519)
keyPairsRouter.post('/', (req: Request, res: Response) => {
  try {
    const body: CreateKeyPairRequest = req.body;
    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ success: false, error: 'Key pair name is required' });
    }

    const cleanName = body.name.trim();
    const existing = getKeyPairByName(cleanName);
    if (existing) {
      return res.status(400).json({ success: false, error: `Key pair '${cleanName}' already exists` });
    }

    const generated = KeyManager.generateKeyPair(cleanName, body.type || 'rsa');
    const nowIso = new Date().toISOString();

    const keyPair: KeyPair = {
      id: generated.id,
      name: generated.name,
      type: generated.type,
      fingerprint: generated.fingerprint,
      publicKey: generated.publicKey,
      createdAt: nowIso,
      instanceCount: 0,
    };

    createKeyPair(keyPair);

    const responseData: CreateKeyPairResponse = {
      keyPair,
      privateKey: generated.privateKey,
    };

    res.status(201).json({ success: true, data: responseData });
  } catch (err: any) {
    console.error('[KeyPairsRouter] Generation error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate key pair' });
  }
});

// POST /api/keypairs/import – import existing public key
keyPairsRouter.post('/import', (req: Request, res: Response) => {
  try {
    const body: ImportKeyPairRequest = req.body;
    if (!body.name || !body.publicKey) {
      return res.status(400).json({ success: false, error: 'Key pair name and public key are required' });
    }

    const cleanName = body.name.trim();
    const existing = getKeyPairByName(cleanName);
    if (existing) {
      return res.status(400).json({ success: false, error: `Key pair '${cleanName}' already exists` });
    }

    const { type, fingerprint } = KeyManager.parsePublicKey(body.publicKey);
    const nowIso = new Date().toISOString();

    const keyPair: KeyPair = {
      id: generateKeyPairId(),
      name: cleanName,
      type,
      fingerprint,
      publicKey: body.publicKey.trim(),
      createdAt: nowIso,
      instanceCount: 0,
    };

    createKeyPair(keyPair);
    res.status(201).json({ success: true, data: keyPair });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Invalid public key' });
  }
});

// DELETE /api/keypairs/:id – delete key pair
keyPairsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const kp = getKeyPairById((req.params.id as string));
    if (!kp) return res.status(404).json({ success: false, error: 'Key pair not found' });

    deleteKeyPair(kp.id);
    res.json({ success: true, data: { message: `Key pair ${kp.name} deleted` } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
