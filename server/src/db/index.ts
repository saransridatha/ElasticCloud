// db/index.ts
// Database interface and typed query helpers for ElasticCloud

import { getDatabase } from './schema';
import type {
  Instance,
  KeyPair,
  SecurityGroup,
  SecurityGroupRule,
  Volume,
  DashboardSummary,
} from '@shared/types';

// ─── Instance Operations ────────────────────────────────────────

export function getAllInstances(): Instance[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM instances ORDER BY launchTime DESC').all() as any[];
  return rows.map(formatInstanceRow);
}

export function getInstanceById(id: string): Instance | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM instances WHERE id = ?').get(id) as any;
  if (!row) return null;
  return formatInstanceRow(row);
}

export function createInstance(instance: Instance): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO instances (
      id, name, state, amiId, instanceType, vcpus, memoryMb,
      storageSizeGb, storageType, deleteStorageOnTermination,
      privateIp, publicIp, sshPort, keyPairId, securityGroupIds,
      volumeId, containerId, launchTime, stateTransitionTime,
      macAddress, networkInterface, tags, platform, architecture
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    instance.id,
    instance.name,
    instance.state,
    instance.amiId,
    instance.instanceType,
    instance.vcpus,
    instance.memoryMb,
    instance.storageSizeGb,
    instance.storageType,
    instance.deleteStorageOnTermination ? 1 : 0,
    instance.privateIp,
    instance.publicIp,
    instance.sshPort,
    instance.keyPairId,
    JSON.stringify(instance.securityGroupIds),
    instance.volumeId,
    instance.containerId,
    instance.launchTime,
    instance.stateTransitionTime,
    instance.macAddress,
    instance.networkInterface,
    JSON.stringify(instance.tags || {}),
    instance.platform,
    instance.architecture
  );

  // Link security groups in junction table
  const linkStmt = db.prepare(
    'INSERT OR IGNORE INTO instance_security_groups (instance_id, security_group_id) VALUES (?, ?)'
  );
  for (const sgId of instance.securityGroupIds) {
    linkStmt.run(instance.id, sgId);
  }
}

export function updateInstance(id: string, updates: Partial<Instance>): void {
  const db = getDatabase();
  const allowedFields = [
    'name', 'state', 'publicIp', 'sshPort', 'containerId',
    'stateTransitionTime', 'tags', 'securityGroupIds'
  ];

  const clauses: string[] = [];
  const params: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (!allowedFields.includes(key)) continue;
    clauses.push(`${key} = ?`);
    if (key === 'tags' || key === 'securityGroupIds') {
      params.push(JSON.stringify(val));
    } else {
      params.push(val);
    }
  }

  if (clauses.length === 0) return;

  params.push(id);
  db.prepare(`UPDATE instances SET ${clauses.join(', ')} WHERE id = ?`).run(...params);

  // If security group ids updated, update junction table
  if (updates.securityGroupIds) {
    db.prepare('DELETE FROM instance_security_groups WHERE instance_id = ?').run(id);
    const linkStmt = db.prepare(
      'INSERT OR IGNORE INTO instance_security_groups (instance_id, security_group_id) VALUES (?, ?)'
    );
    for (const sgId of updates.securityGroupIds) {
      linkStmt.run(id, sgId);
    }
  }
}

export function deleteInstance(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM instances WHERE id = ?').run(id);
}

function formatInstanceRow(row: any): Instance {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    amiId: row.amiId,
    instanceType: row.instanceType,
    vcpus: Number(row.vcpus),
    memoryMb: Number(row.memoryMb),
    storageSizeGb: Number(row.storageSizeGb),
    storageType: row.storageType,
    deleteStorageOnTermination: Boolean(row.deleteStorageOnTermination),
    privateIp: row.privateIp,
    publicIp: row.publicIp || '',
    sshPort: Number(row.sshPort),
    keyPairId: row.keyPairId || null,
    securityGroupIds: JSON.parse(row.securityGroupIds || '[]'),
    volumeId: row.volumeId,
    containerId: row.containerId || null,
    launchTime: row.launchTime,
    stateTransitionTime: row.stateTransitionTime,
    macAddress: row.macAddress,
    networkInterface: row.networkInterface,
    tags: JSON.parse(row.tags || '{}'),
    platform: row.platform,
    architecture: row.architecture,
  };
}

// ─── Key Pairs ─────────────────────────────────────────────────

export function getAllKeyPairs(): KeyPair[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM key_pairs ORDER BY createdAt DESC').all() as any[];
  return rows.map((row) => {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM instances WHERE keyPairId = ?').get(row.id) as any;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      fingerprint: row.fingerprint,
      publicKey: row.publicKey,
      createdAt: row.createdAt,
      instanceCount: countRow?.count || 0,
    };
  });
}

export function getKeyPairById(id: string): KeyPair | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM key_pairs WHERE id = ?').get(id) as any;
  if (!row) return null;
  const countRow = db.prepare('SELECT COUNT(*) as count FROM instances WHERE keyPairId = ?').get(row.id) as any;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    fingerprint: row.fingerprint,
    publicKey: row.publicKey,
    createdAt: row.createdAt,
    instanceCount: countRow?.count || 0,
  };
}

export function getKeyPairByName(name: string): KeyPair | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM key_pairs WHERE name = ?').get(name) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    fingerprint: row.fingerprint,
    publicKey: row.publicKey,
    createdAt: row.createdAt,
  };
}

export function createKeyPair(kp: KeyPair): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO key_pairs (id, name, type, fingerprint, publicKey, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(kp.id, kp.name, kp.type, kp.fingerprint, kp.publicKey, kp.createdAt);
}

export function deleteKeyPair(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM key_pairs WHERE id = ?').run(id);
}

// ─── Security Groups ──────────────────────────────────────────

export function getAllSecurityGroups(): SecurityGroup[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM security_groups ORDER BY createdAt DESC').all() as any[];
  return rows.map((row) => getSecurityGroupWithRules(row));
}

export function getSecurityGroupById(id: string): SecurityGroup | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM security_groups WHERE id = ?').get(id) as any;
  if (!row) return null;
  return getSecurityGroupWithRules(row);
}

function getSecurityGroupWithRules(row: any): SecurityGroup {
  const db = getDatabase();
  const rules = db.prepare('SELECT * FROM security_group_rules WHERE security_group_id = ?').all(row.id) as any[];
  
  const inboundRules: SecurityGroupRule[] = [];
  const outboundRules: SecurityGroupRule[] = [];

  for (const r of rules) {
    const formattedRule: SecurityGroupRule = {
      id: r.id,
      direction: r.direction,
      protocol: r.protocol,
      portRange: r.portRange,
      cidr: r.cidr,
      action: r.action,
      description: r.description,
      ruleType: r.ruleType,
    };
    if (r.direction === 'inbound') {
      inboundRules.push(formattedRule);
    } else {
      outboundRules.push(formattedRule);
    }
  }

  const countRow = db.prepare(
    'SELECT COUNT(DISTINCT instance_id) as count FROM instance_security_groups WHERE security_group_id = ?'
  ).get(row.id) as any;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    inboundRules,
    outboundRules,
    instanceCount: countRow?.count || 0,
    createdAt: row.createdAt,
    vpcId: row.vpcId,
  };
}

export function createSecurityGroup(sg: Omit<SecurityGroup, 'inboundRules' | 'outboundRules' | 'instanceCount'>): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO security_groups (id, name, description, vpcId, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(sg.id, sg.name, sg.description, sg.vpcId, sg.createdAt);
}

export function updateSecurityGroup(id: string, updates: { name?: string; description?: string }): void {
  const db = getDatabase();
  if (updates.name && updates.description !== undefined) {
    db.prepare('UPDATE security_groups SET name = ?, description = ? WHERE id = ?').run(updates.name, updates.description, id);
  } else if (updates.name) {
    db.prepare('UPDATE security_groups SET name = ? WHERE id = ?').run(updates.name, id);
  } else if (updates.description !== undefined) {
    db.prepare('UPDATE security_groups SET description = ? WHERE id = ?').run(updates.description, id);
  }
}

export function deleteSecurityGroup(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM security_groups WHERE id = ?').run(id);
}

export function addSecurityGroupRule(sgId: string, rule: SecurityGroupRule): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO security_group_rules (id, security_group_id, direction, protocol, portRange, cidr, action, description, ruleType)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    rule.id,
    sgId,
    rule.direction,
    rule.protocol,
    rule.portRange,
    rule.cidr,
    rule.action,
    rule.description,
    rule.ruleType
  );
}

export function removeSecurityGroupRule(ruleId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM security_group_rules WHERE id = ?').run(ruleId);
}

// ─── Volumes ───────────────────────────────────────────────────

export function getAllVolumes(): Volume[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM volumes ORDER BY createdAt DESC').all() as any[];
  return rows.map(formatVolumeRow);
}

export function getVolumeById(id: string): Volume | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM volumes WHERE id = ?').get(id) as any;
  if (!row) return null;
  return formatVolumeRow(row);
}

export function createVolume(volume: Volume): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO volumes (
      id, name, sizeGb, volumeType, state, iops, throughput,
      attachedInstanceId, deviceName, deleteOnTermination,
      createdAt, encrypted, availabilityZone
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    volume.id,
    volume.name,
    volume.sizeGb,
    volume.volumeType,
    volume.state,
    volume.iops,
    volume.throughput,
    volume.attachedInstanceId,
    volume.deviceName,
    volume.deleteOnTermination ? 1 : 0,
    volume.createdAt,
    volume.encrypted ? 1 : 0,
    volume.availabilityZone
  );
}

export function updateVolume(id: string, updates: Partial<Volume>): void {
  const db = getDatabase();
  const allowed = ['name', 'state', 'attachedInstanceId', 'deleteOnTermination'];
  const clauses: string[] = [];
  const params: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (!allowed.includes(key)) continue;
    clauses.push(`${key} = ?`);
    params.push(key === 'deleteOnTermination' ? (val ? 1 : 0) : val);
  }

  if (clauses.length === 0) return;
  params.push(id);
  db.prepare(`UPDATE volumes SET ${clauses.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteVolume(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM volumes WHERE id = ?').run(id);
}

function formatVolumeRow(row: any): Volume {
  return {
    id: row.id,
    name: row.name,
    sizeGb: Number(row.sizeGb),
    volumeType: row.volumeType,
    state: row.state,
    iops: Number(row.iops),
    throughput: Number(row.throughput),
    attachedInstanceId: row.attachedInstanceId || null,
    deviceName: row.deviceName,
    deleteOnTermination: Boolean(row.deleteOnTermination),
    createdAt: row.createdAt,
    encrypted: Boolean(row.encrypted),
    availabilityZone: row.availabilityZone,
  };
}

// ─── Dashboard Summary ─────────────────────────────────────────

export function getDashboardSummary(): DashboardSummary {
  const db = getDatabase();
  const instances = getAllInstances();
  const volumes = getAllVolumes();
  const keyPairs = getAllKeyPairs();
  const securityGroups = getAllSecurityGroups();

  let totalVcpus = 0;
  let totalMemoryMb = 0;
  let runningInstances = 0;
  let stoppedInstances = 0;

  for (const inst of instances) {
    if (inst.state === 'running') {
      runningInstances++;
      totalVcpus += inst.vcpus;
      totalMemoryMb += inst.memoryMb;
    } else if (inst.state === 'stopped') {
      stoppedInstances++;
    }
  }

  const totalStorageGb = volumes.reduce((acc, v) => acc + v.sizeGb, 0);

  return {
    totalInstances: instances.length,
    runningInstances,
    stoppedInstances,
    totalVcpus,
    totalMemoryMb,
    totalStorageGb,
    totalVolumes: volumes.length,
    totalSecurityGroups: securityGroups.length,
    totalKeyPairs: keyPairs.length,
  };
}
