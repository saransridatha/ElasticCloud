// routes/volumes.ts
// EBS Block Volumes management

import { Router, Request, Response } from 'express';
import { getAllVolumes, getVolumeById, createVolume, deleteVolume, updateVolume } from '../db';
import { generateVolumeId } from '../services/id-generator';
import type { Volume, VolumeType } from '@shared/types';

export const volumesRouter = Router();

// GET /api/volumes – list all
volumesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const volumes = getAllVolumes();
    res.json({ success: true, data: volumes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/volumes/:id – get single volume
volumesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const volume = getVolumeById((req.params.id as string));
    if (!volume) return res.status(404).json({ success: false, error: 'Volume not found' });
    res.json({ success: true, data: volume });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/volumes – create standalone volume
volumesRouter.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const volId = generateVolumeId();
    const nowIso = new Date().toISOString();

    const volume: Volume = {
      id: volId,
      name: body.name || `vol-${volId.slice(4, 10)}`,
      sizeGb: Number(body.sizeGb) || 20,
      volumeType: (body.volumeType as VolumeType) || 'gp3',
      state: 'available',
      iops: body.volumeType === 'io2' ? (Number(body.iops) || 5000) : 3000,
      throughput: 125,
      attachedInstanceId: null,
      deviceName: '/dev/sdb',
      deleteOnTermination: false,
      createdAt: nowIso,
      encrypted: true,
      availabilityZone: 'us-east-1a',
    };

    createVolume(volume);
    res.status(201).json({ success: true, data: volume });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/volumes/:id – delete volume
volumesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const vol = getVolumeById((req.params.id as string));
    if (!vol) return res.status(404).json({ success: false, error: 'Volume not found' });
    if (vol.state === 'in-use') {
      return res.status(400).json({ success: false, error: 'Cannot delete volume attached to an active instance' });
    }

    deleteVolume(vol.id);
    res.json({ success: true, data: { message: `Volume ${vol.id} deleted` } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
