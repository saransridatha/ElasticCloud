// index.ts
// ElasticCloud API and WebSocket Server Entry Point

import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';

import path from 'path';
import fs from 'fs';

import { getDatabase, closeDatabase } from './db/schema';
import { getAllInstances, createInstance, createVolume, getAllKeyPairs, createKeyPair } from './db';
import { instancesRouter } from './routes/instances';
import { keyPairsRouter } from './routes/keypairs';
import { securityGroupsRouter } from './routes/security-groups';
import { volumesRouter } from './routes/volumes';
import { amisRouter } from './routes/amis';
import { dashboardRouter } from './routes/dashboard';
import { handleTerminalConnection } from './websocket/terminal';
import { handleMetricsConnection } from './websocket/metrics';
import { telemetryService } from './services/telemetry';
import { computeDriver } from './services/compute-driver';
import { KeyManager } from './services/key-manager';
import { simulatedSshServer } from './services/simulated-sshd';
import type { Instance, Volume } from '@shared/types';

const app = express();
const PORT = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '3000' : '3001'), 10);
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoints for AWS Target Groups, ECS, and Kubernetes probes
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    runtime: computeDriver.isDockerAvailable() ? 'container' : 'simulation',
    runtimeType: computeDriver.getRuntimeType(),
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', healthHandler);
app.get('/healthz', healthHandler);

// API Routes
app.use('/api/instances', instancesRouter);
app.use('/api/keypairs', keyPairsRouter);
app.use('/api/security-groups', securityGroupsRouter);
app.use('/api/volumes', volumesRouter);
app.use('/api/amis', amisRouter);
app.use('/api/dashboard', dashboardRouter);

// Static client UI serving for production container deployments
function resolveClientDist(): string | null {
  const candidates = [
    process.env.CLIENT_DIST,
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    '/app/client/dist',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return null;
}

const clientDist = resolveClientDist();
if (clientDist) {
  console.log(`[ElasticCloud] Serving production UI from: ${clientDist}`);
  app.use(express.static(clientDist, { index: false }));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  // Client-side SPA routing fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route '${req.method} ${req.path}' not found`,
  });
});

const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const parsedUrl = url.parse(request.url || '', true);
  const pathname = parsedUrl.pathname || '';

  if (pathname.startsWith('/ws/terminal') || pathname.startsWith('/ws/metrics')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;
  const instanceId = parsedUrl.query.instanceId as string;

  if (!instanceId) {
    ws.close(1008, 'instanceId query parameter is required');
    return;
  }

  if (pathname === '/ws/terminal') {
    handleTerminalConnection(ws, instanceId);
  } else if (pathname === '/ws/metrics') {
    handleMetricsConnection(ws, instanceId);
  }
});

// Seed sample data if DB is empty for great out-of-the-box experience
function seedInitialDataIfEmpty(): void {
  const instances = getAllInstances();
  if (instances.length > 0) return;

  console.log('[ElasticCloud] Seeding initial sample resources...');

  // Create default admin key pair
  const adminKey = KeyManager.generateKeyPair('admin-key-pair', 'rsa');
  createKeyPair({
    id: adminKey.id,
    name: adminKey.name,
    type: adminKey.type,
    fingerprint: adminKey.fingerprint,
    publicKey: adminKey.publicKey,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    instanceCount: 1,
  });

  // Seed sample instance 1: Web Server
  const now = new Date();
  const inst1: Instance = {
    id: 'i-0a892b1c4d5e6f7a',
    name: 'prod-web-frontend-01',
    state: 'running',
    amiId: 'ami-ubuntu2404',
    instanceType: 't3.micro',
    vcpus: 1,
    memoryMb: 1024,
    storageSizeGb: 20,
    storageType: 'gp3',
    deleteStorageOnTermination: true,
    privateIp: '172.31.16.42',
    publicIp: '54.210.88.19',
    sshPort: 2201,
    keyPairId: adminKey.id,
    securityGroupIds: ['sg-default'],
    volumeId: 'vol-0f8120d9128aa10',
    containerId: 'sim-0a892b1c',
    launchTime: new Date(now.getTime() - 3600000 * 4).toISOString(),
    stateTransitionTime: new Date(now.getTime() - 3600000 * 4).toISOString(),
    macAddress: '02:42:ac:11:00:02',
    networkInterface: 'eni-08d7211bf49a0c',
    tags: { Name: 'prod-web-frontend-01', Environment: 'Production', Role: 'Web' },
    platform: 'linux',
    architecture: 'x86_64',
  };

  createVolume({
    id: 'vol-0f8120d9128aa10',
    name: 'prod-web-root',
    sizeGb: 20,
    volumeType: 'gp3',
    state: 'in-use',
    iops: 3000,
    throughput: 125,
    attachedInstanceId: inst1.id,
    deviceName: '/dev/sda1',
    deleteOnTermination: true,
    createdAt: inst1.launchTime,
    encrypted: true,
    availabilityZone: 'us-east-1a',
  });
  createInstance(inst1);
  simulatedSshServer.startServer(inst1.id, inst1.sshPort, 'ubuntu', adminKey.publicKey);

  // Seed sample instance 2: Database Server
  const inst2: Instance = {
    id: 'i-07bc418de29fa3c1',
    name: 'staging-database-redis',
    state: 'stopped',
    amiId: 'ami-debian12',
    instanceType: 'm6i.large',
    vcpus: 2,
    memoryMb: 8192,
    storageSizeGb: 100,
    storageType: 'io2',
    deleteStorageOnTermination: false,
    privateIp: '172.31.28.109',
    publicIp: '',
    sshPort: 2202,
    keyPairId: adminKey.id,
    securityGroupIds: ['sg-default'],
    volumeId: 'vol-0e31945ab89cc91',
    containerId: 'sim-07bc418d',
    launchTime: new Date(now.getTime() - 86400000).toISOString(),
    stateTransitionTime: new Date(now.getTime() - 3600000 * 2).toISOString(),
    macAddress: '02:42:ac:11:00:03',
    networkInterface: 'eni-0bc49281efa891',
    tags: { Name: 'staging-database-redis', Environment: 'Staging', Tier: 'Data' },
    platform: 'linux',
    architecture: 'x86_64',
  };

  createVolume({
    id: 'vol-0e31945ab89cc91',
    name: 'redis-data-vol',
    sizeGb: 100,
    volumeType: 'io2',
    state: 'in-use',
    iops: 5000,
    throughput: 250,
    attachedInstanceId: inst2.id,
    deviceName: '/dev/xvda',
    deleteOnTermination: false,
    createdAt: inst2.launchTime,
    encrypted: true,
    availabilityZone: 'us-east-1a',
  });
  createInstance(inst2);

  // Seed sample volume available for attachment
  createVolume({
    id: 'vol-09941a82bc12941',
    name: 'backup-snapshot-archive',
    sizeGb: 250,
    volumeType: 'gp3',
    state: 'available',
    iops: 3000,
    throughput: 125,
    attachedInstanceId: null,
    deviceName: '/dev/sdb',
    deleteOnTermination: false,
    createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
    encrypted: true,
    availabilityZone: 'us-east-1a',
  });
}

// Initialize server
getDatabase();
seedInitialDataIfEmpty();
telemetryService.start(5000);

// Graceful Shutdown Handler for containers (Docker, ECS, Fargate, Kubernetes)
let isShuttingDown = false;
function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[ElasticCloud] Received ${signal}. Initiating graceful shutdown...`);

  // Fallback watchdog timer: force exit if cleanup takes longer than 5 seconds
  const forceTimer = setTimeout(() => {
    console.error('[ElasticCloud] Force shutdown timeout reached (5s). Terminating process.');
    process.exit(1);
  }, 5000);
  forceTimer.unref();

  // Close all active WebSocket connections
  wss.clients.forEach((client) => {
    try {
      client.close(1001, 'Server shutting down');
    } catch {}
  });

  // Stop background services
  telemetryService.stop();
  simulatedSshServer.stopAll();

  // Close HTTP server and database
  server.close(() => {
    console.log('[ElasticCloud] HTTP server closed.');
    closeDatabase();
    console.log('[ElasticCloud] Shutdown complete. Exiting cleanly.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, HOST, () => {
  console.log(`
╔═════════════════════════════════════════════════════════════════╗
║                      ElasticCloud Control Plane                 ║
║           AWS EC2 Cloud Console & Compute Orchestrator          ║
╚═════════════════════════════════════════════════════════════════╝
  ► Server URL:      http://${HOST}:${PORT}
  ► REST API:        http://${HOST}:${PORT}/api
  ► Health Check:    http://${HOST}:${PORT}/api/health
  ► WebSocket:       ws://${HOST}:${PORT}/ws/terminal & /ws/metrics
  ► UI Mode:         ${clientDist ? `Production SPA (${clientDist})` : 'Development Proxy Mode'}
  ► Engine Runtime:  ${computeDriver.isDockerAvailable() ? `Container Socket Active (${computeDriver.getRuntimeType()})` : 'Graceful Simulation Engine'}
  ► Database:        SQLite Active (${process.env.DATA_DIR || 'default data directory'})
  `);
});
