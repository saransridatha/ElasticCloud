// routes/instances.ts
// Instance provisioning, lifecycle management, and log/telemetry inspection

import { Router, Request, Response } from 'express';
import {
  getAllInstances,
  getInstanceById,
  createInstance,
  updateInstance,
  deleteInstance,
  getKeyPairById,
  createVolume,
  getVolumeById,
  updateVolume,
  deleteVolume,
} from '../db';
import {
  generateInstanceId,
  generateVolumeId,
  generateMacAddress,
  generateNetworkInterfaceId,
} from '../services/id-generator';
import { computeDriver } from '../services/compute-driver';
import { telemetryService } from '../services/telemetry';
import type { LaunchInstanceRequest, Instance, Volume, VolumeType } from '@shared/types';

export const instancesRouter = Router();

// GET /api/instances – list all instances
instancesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const instances = getAllInstances();
    res.json({ success: true, data: instances });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/instances/:id – get single instance
instancesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const instance = getInstanceById((req.params.id as string));
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    res.json({ success: true, data: instance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/instances – launch new instance
instancesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body: LaunchInstanceRequest = req.body;
    if (!body.name || !body.amiId) {
      return res.status(400).json({ success: false, error: 'Name and AMI ID are required' });
    }

    const instanceId = generateInstanceId();
    const volumeId = generateVolumeId();
    const nowIso = new Date().toISOString();

    // Create root EBS volume
    const volume: Volume = {
      id: volumeId,
      name: `${body.name}-root-vol`,
      sizeGb: body.storageSizeGb || 8,
      volumeType: (body.storageType as VolumeType) || 'gp3',
      state: 'in-use',
      iops: body.storageType === 'io2' ? 5000 : 3000,
      throughput: 125,
      attachedInstanceId: instanceId,
      deviceName: '/dev/sda1',
      deleteOnTermination: body.deleteStorageOnTermination !== undefined ? body.deleteStorageOnTermination : true,
      createdAt: nowIso,
      encrypted: true,
      availabilityZone: 'us-east-1a',
    };
    createVolume(volume);

    // Retrieve public key if key pair specified
    let publicKey: string | undefined;
    if (body.keyPairId) {
      const kp = getKeyPairById(body.keyPairId);
      if (kp) publicKey = kp.publicKey;
    }

    const instance: Instance = {
      id: instanceId,
      name: body.name,
      state: 'pending',
      amiId: body.amiId,
      instanceType: body.instanceType || 't3.micro',
      vcpus: Number(body.vcpus) || 1,
      memoryMb: Number(body.memoryMb) || 1024,
      storageSizeGb: Number(body.storageSizeGb) || 8,
      storageType: body.storageType || 'gp3',
      deleteStorageOnTermination: body.deleteStorageOnTermination !== undefined ? body.deleteStorageOnTermination : true,
      privateIp: '172.31.0.0', // will be updated by computeDriver
      publicIp: '',
      sshPort: 0,
      keyPairId: body.keyPairId || null,
      securityGroupIds: Array.isArray(body.securityGroupIds) && body.securityGroupIds.length > 0
        ? body.securityGroupIds
        : ['sg-default'],
      volumeId,
      containerId: null,
      launchTime: nowIso,
      stateTransitionTime: nowIso,
      macAddress: generateMacAddress(),
      networkInterface: generateNetworkInterfaceId(),
      tags: body.tags || { Name: body.name, Environment: 'Development' },
      platform: 'linux',
      architecture: 'x86_64',
    };

    // Save initial record to DB
    createInstance(instance);

    // Trigger compute driver launch (asynchronous container / simulation spin-up)
    const { containerId, sshPort, privateIp } = await computeDriver.launchInstance(instance, publicKey);

    updateInstance(instanceId, {
      containerId,
      sshPort,
      privateIp,
    });

    const updated = getInstanceById(instanceId);
    res.status(201).json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[InstancesRouter] Launch error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to launch instance' });
  }
});

// POST /api/instances/:id/start
instancesRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const inst = getInstanceById((req.params.id as string));
    if (!inst) return res.status(404).json({ success: false, error: 'Instance not found' });
    if (inst.state !== 'stopped') {
      return res.status(400).json({ success: false, error: `Cannot start instance in '${inst.state}' state` });
    }

    await computeDriver.startInstance(inst.id, inst.containerId);
    const updated = getInstanceById(inst.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/instances/:id/stop
instancesRouter.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const inst = getInstanceById((req.params.id as string));
    if (!inst) return res.status(404).json({ success: false, error: 'Instance not found' });
    if (inst.state !== 'running') {
      return res.status(400).json({ success: false, error: `Cannot stop instance in '${inst.state}' state` });
    }

    await computeDriver.stopInstance(inst.id, inst.containerId);
    const updated = getInstanceById(inst.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/instances/:id/reboot
instancesRouter.post('/:id/reboot', async (req: Request, res: Response) => {
  try {
    const inst = getInstanceById((req.params.id as string));
    if (!inst) return res.status(404).json({ success: false, error: 'Instance not found' });
    if (inst.state !== 'running') {
      return res.status(400).json({ success: false, error: `Cannot reboot instance in '${inst.state}' state` });
    }

    await computeDriver.rebootInstance(inst.id, inst.containerId);
    const updated = getInstanceById(inst.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/instances/:id/terminate
instancesRouter.post('/:id/terminate', async (req: Request, res: Response) => {
  try {
    const inst = getInstanceById((req.params.id as string));
    if (!inst) return res.status(404).json({ success: false, error: 'Instance not found' });
    if (inst.state === 'terminated') {
      return res.status(400).json({ success: false, error: 'Instance is already terminated' });
    }

    await computeDriver.terminateInstance(inst.id, inst.containerId);

    // Handle root volume cleanup if deleteStorageOnTermination is true
    if (inst.deleteStorageOnTermination && inst.volumeId) {
      deleteVolume(inst.volumeId);
    } else if (inst.volumeId) {
      updateVolume(inst.volumeId, { state: 'available', attachedInstanceId: null });
    }

    const updated = getInstanceById(inst.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/instances/:id/logs – fetch system and boot logs
instancesRouter.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const inst = getInstanceById((req.params.id as string));
    if (!inst) return res.status(404).json({ success: false, error: 'Instance not found' });

    const logs = await computeDriver.getContainerLogs(inst.id, inst.containerId);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/instances/:id/metrics – fetch rolling telemetry
instancesRouter.get('/:id/metrics', (req: Request, res: Response) => {
  try {
    const inst = getInstanceById((req.params.id as string));
    if (!inst) return res.status(404).json({ success: false, error: 'Instance not found' });

    const metrics = telemetryService.getMetrics(inst.id);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/instances/:id – rename or update tags
instancesRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const inst = getInstanceById((req.params.id as string));
    if (!inst) return res.status(404).json({ success: false, error: 'Instance not found' });

    const updates: Partial<Instance> = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.tags) updates.tags = req.body.tags;

    updateInstance(inst.id, updates);
    const updated = getInstanceById(inst.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
