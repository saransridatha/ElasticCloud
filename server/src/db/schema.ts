// db/schema.ts
// SQLite schema definition and initialization

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { generateRuleId } from '../services/id-generator';

const DB_DIR = path.resolve(__dirname, '..', '..', 'data');
const LEGACY_DB_PATH = path.join(DB_DIR, 'nimbus.db');
const DB_PATH = path.join(DB_DIR, 'elastic.db');

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    // Migrate from nimbus.db to elastic.db if available
    if (fs.existsSync(LEGACY_DB_PATH) && !fs.existsSync(DB_PATH)) {
      try {
        fs.copyFileSync(LEGACY_DB_PATH, DB_PATH);
      } catch {
        // ignore
      }
    }
    const targetDbPath = fs.existsSync(DB_PATH) ? DB_PATH : (fs.existsSync(LEGACY_DB_PATH) ? LEGACY_DB_PATH : DB_PATH);
    db = new Database(targetDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      amiId TEXT NOT NULL,
      instanceType TEXT NOT NULL,
      vcpus REAL NOT NULL,
      memoryMb INTEGER NOT NULL,
      storageSizeGb INTEGER NOT NULL,
      storageType TEXT NOT NULL DEFAULT 'gp3',
      deleteStorageOnTermination INTEGER NOT NULL DEFAULT 1,
      privateIp TEXT NOT NULL,
      publicIp TEXT NOT NULL DEFAULT '',
      sshPort INTEGER NOT NULL DEFAULT 0,
      keyPairId TEXT,
      securityGroupIds TEXT NOT NULL DEFAULT '[]',
      volumeId TEXT NOT NULL DEFAULT '',
      containerId TEXT,
      launchTime TEXT NOT NULL,
      stateTransitionTime TEXT NOT NULL,
      macAddress TEXT NOT NULL,
      networkInterface TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '{}',
      platform TEXT NOT NULL DEFAULT 'linux',
      architecture TEXT NOT NULL DEFAULT 'x86_64'
    );

    CREATE TABLE IF NOT EXISTS key_pairs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'rsa',
      fingerprint TEXT NOT NULL,
      publicKey TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      vpcId TEXT NOT NULL DEFAULT 'vpc-0a1b2c3d4e5f6789',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_group_rules (
      id TEXT PRIMARY KEY,
      security_group_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      protocol TEXT NOT NULL,
      portRange TEXT NOT NULL DEFAULT 'All',
      cidr TEXT NOT NULL DEFAULT '0.0.0.0/0',
      action TEXT NOT NULL DEFAULT 'ALLOW',
      description TEXT NOT NULL DEFAULT '',
      ruleType TEXT NOT NULL DEFAULT 'Custom',
      FOREIGN KEY (security_group_id) REFERENCES security_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS volumes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      sizeGb INTEGER NOT NULL DEFAULT 8,
      volumeType TEXT NOT NULL DEFAULT 'gp3',
      state TEXT NOT NULL DEFAULT 'available',
      iops INTEGER NOT NULL DEFAULT 3000,
      throughput INTEGER NOT NULL DEFAULT 125,
      attachedInstanceId TEXT,
      deviceName TEXT NOT NULL DEFAULT '/dev/sda1',
      deleteOnTermination INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      encrypted INTEGER NOT NULL DEFAULT 1,
      availabilityZone TEXT NOT NULL DEFAULT 'us-east-1a'
    );

    CREATE TABLE IF NOT EXISTS instance_security_groups (
      instance_id TEXT NOT NULL,
      security_group_id TEXT NOT NULL,
      PRIMARY KEY (instance_id, security_group_id),
      FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE,
      FOREIGN KEY (security_group_id) REFERENCES security_groups(id) ON DELETE CASCADE
    );
  `);

  // Create default security group if it doesn't exist
  const defaultSg = db.prepare('SELECT id FROM security_groups WHERE id = ?').get('sg-default');
  if (!defaultSg) {
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO security_groups (id, name, description, vpcId, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run('sg-default', 'default', 'Default security group', 'vpc-0a1b2c3d4e5f6789', now);

    const sshRuleId = generateRuleId();
    db.prepare(
      'INSERT INTO security_group_rules (id, security_group_id, direction, protocol, portRange, cidr, action, description, ruleType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(sshRuleId, 'sg-default', 'inbound', 'tcp', '22', '0.0.0.0/0', 'ALLOW', 'Allow SSH access', 'SSH');

    const outRuleId = generateRuleId();
    db.prepare(
      'INSERT INTO security_group_rules (id, security_group_id, direction, protocol, portRange, cidr, action, description, ruleType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(outRuleId, 'sg-default', 'outbound', 'all', 'All', '0.0.0.0/0', 'ALLOW', 'Allow all outbound traffic', 'All Traffic');
  }
}

export { DB_PATH };
