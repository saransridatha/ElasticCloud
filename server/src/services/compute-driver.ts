// services/compute-driver.ts
// Compute Driver supporting both Docker/Podman container runtime and realistic simulation fallback

import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import { updateInstance, getInstanceById, getAllInstances } from '../db';
import { generatePrivateIp, generateMacAddress, generateNetworkInterfaceId } from './id-generator';
import type { Instance, LaunchInstanceRequest, InstanceState } from '@shared/types';
import { simulatedSshServer } from './simulated-sshd';

export interface ComputeStats {
  cpuPercent: number;
  memoryUsageMb: number;
  networkInKbps: number;
  networkOutKbps: number;
}

export class ComputeDriver {
  private docker: any = null;
  private dockerAvailable = false;
  private runtimeType: 'docker' | 'podman' | 'none' = 'none';
  private runtimeCommand: string = 'podman';
  private simulatedInstances = new Map<string, {
    state: InstanceState;
    baseCpu: number;
    baseMemory: number;
    logs: string[];
    launchTime: number;
  }>();

  constructor() {
    this.detectContainerRuntime();
  }

  private detectContainerRuntime(): void {
    const candidateSockets = [
      process.env.DOCKER_HOST,
      `/run/user/${process.getuid ? process.getuid() : 1000}/podman/podman.sock`,
      '/var/run/podman/podman.sock',
      '/run/podman/podman.sock',
      '/var/run/docker.sock',
    ].filter(Boolean) as string[];

    for (const sock of candidateSockets) {
      if (sock.startsWith('unix://') || fs.existsSync(sock)) {
        try {
          const socketPath = sock.replace(/^unix:\/\//, '');
          const d = new Docker({ socketPath });
          this.docker = d;
          this.dockerAvailable = true;
          if (process.env.CONTAINER_RUNTIME) {
            this.runtimeType = process.env.CONTAINER_RUNTIME.toLowerCase() as 'docker' | 'podman';
          } else if (sock.includes('docker')) {
            this.runtimeType = 'docker';
          } else {
            this.runtimeType = 'podman';
          }
          this.runtimeCommand = this.runtimeType === 'docker' ? 'docker' : 'podman';
          console.log(`[ComputeDriver] Connected to container runtime (${this.runtimeType}) socket: ${socketPath}`);
          return;
        } catch (e: any) {
          console.warn(`[ComputeDriver] Failed to connect to ${sock}:`, e.message);
        }
      }
    }

    this.runtimeType = 'none';
    console.log('[ComputeDriver] No container socket found; running in SIMULATION mode.');
  }

  public isDockerAvailable(): boolean {
    return this.dockerAvailable;
  }

  public getRuntimeType(): 'docker' | 'podman' | 'none' {
    return this.runtimeType;
  }

  public getRuntimeCommand(): string {
    return this.runtimeCommand;
  }

  /**
   * Finds an available host port in range 2201-2299
   */
  public allocateSshPort(): number {
    const instances = getAllInstances();
    const usedPorts = new Set(
      instances
        .filter((i) => i.state !== 'terminated')
        .map((i) => i.sshPort)
        .filter((p) => p > 0)
    );

    for (let p = 2201; p <= 2299; p++) {
      if (!usedPorts.has(p)) {
        return p;
      }
    }
    return 2200 + Math.floor(Math.random() * 100);
  }

  /**
   * Launch instance: creates container or initializes simulation
   */
  public async launchInstance(
    instance: Instance,
    publicKey?: string
  ): Promise<{ containerId: string | null; sshPort: number; privateIp: string }> {
    const sshPort = this.allocateSshPort();
    const privateIp = generatePrivateIp();

    // Default OS user mapping
    let osUser = 'ubuntu';
    if (instance.amiId.includes('debian')) osUser = 'debian';
    if (instance.amiId.includes('alpine')) osUser = 'alpine';

    if (this.dockerAvailable && this.docker) {
      try {
        const container = await this.createContainer(instance, sshPort, osUser, publicKey);
        await container.start();
        const info = await container.inspect();
        const containerId = info.Id.slice(0, 12);

        // Schedule state transition pending -> running
        setTimeout(() => {
          updateInstance(instance.id, {
            state: 'running',
            containerId,
            publicIp: '127.0.0.1',
            sshPort,
          });
        }, 3000);

        return { containerId, sshPort, privateIp };
      } catch (err: any) {
        console.warn(`[ComputeDriver] Container spawn failed (${err.message}). Falling back to simulation mode for ${instance.id}.`);
      }
    }

    // Simulation Fallback
    const baseCpu = 2 + Math.random() * 8;
    const baseMemory = Math.min(instance.memoryMb * 0.35, 120 + Math.random() * 80);
    const logs = this.generateBootLogs(instance, osUser, publicKey);

    this.simulatedInstances.set(instance.id, {
      state: 'pending',
      baseCpu,
      baseMemory,
      logs,
      launchTime: Date.now(),
    });

    // Simulate boot duration: transition from pending -> running after 3 seconds
    setTimeout(() => {
      const sim = this.simulatedInstances.get(instance.id);
      if (sim && sim.state === 'pending') {
        sim.state = 'running';
        sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] systemd[1]: Startup finished in 1.482s.`);
        sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] sshd[612]: Server listening on 0.0.0.0 port 22.`);
        sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] sshd[612]: Server listening on :: port 22.`);
        updateInstance(instance.id, {
          state: 'running',
          publicIp: '127.0.0.1',
          sshPort,
          containerId: `sim-${instance.id.slice(2, 10)}`,
        });
        simulatedSshServer.startServer(instance.id, sshPort, osUser, publicKey);
      }
    }, 3500);

    return {
      containerId: `sim-${instance.id.slice(2, 10)}`,
      sshPort,
      privateIp,
    };
  }

  private async createContainer(
    instance: Instance,
    sshPort: number,
    osUser: string,
    publicKey?: string
  ): Promise<any> {
    if (!this.docker) throw new Error('Docker not initialized');

    let imageName = 'elastic-ubuntu:24.04';
    if (instance.amiId.includes('debian')) imageName = 'elastic-debian:12';
    if (instance.amiId.includes('alpine')) imageName = 'elastic-alpine:3.20';

    const nanoCpus = Math.round(instance.vcpus * 1e9);
    const memoryBytes = instance.memoryMb * 1024 * 1024;

    const container = await (this.docker as any).createContainer({
      Image: imageName,
      name: `elastic-${instance.id}`,
      Hostname: instance.id,
      WorkingDir: `/home/${osUser}`,
      Env: [
        `SSH_PUBLIC_KEY=${publicKey || ''}`,
        `OS_DEFAULT_USER=${osUser}`,
        `ELASTIC_INSTANCE_ID=${instance.id}`,
      ],
      ExposedPorts: {
        '22/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '22/tcp': [{ HostPort: String(sshPort), HostIp: '0.0.0.0' }],
        },
        NanoCpus: nanoCpus,
        Memory: memoryBytes,
        MemorySwap: memoryBytes * 2,
        RestartPolicy: { Name: 'no' },
      },
    });

    return container;
  }

  /**
   * Start instance
   */
  public async startInstance(id: string, containerId: string | null): Promise<void> {
    if (containerId && !containerId.startsWith('sim-') && this.docker) {
      try {
        const container = this.docker.getContainer(containerId);
        await container.start();
      } catch (err: any) {
        console.warn(`[ComputeDriver] Container start failed: ${err.message}`);
      }
    }

    const sim = this.simulatedInstances.get(id);
    if (sim) {
      sim.state = 'pending';
      sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] Kernel: resuming from power state S5.`);
    }

    updateInstance(id, { state: 'pending' });
    setTimeout(() => {
      if (sim) sim.state = 'running';
      updateInstance(id, { state: 'running' });
    }, 2500);
  }

  /**
   * Stop instance
   */
  public async stopInstance(id: string, containerId: string | null): Promise<void> {
    updateInstance(id, { state: 'stopping' });

    if (containerId && !containerId.startsWith('sim-') && this.docker) {
      try {
        const container = this.docker.getContainer(containerId);
        await container.stop({ t: 5 });
      } catch (err: any) {
        console.warn(`[ComputeDriver] Container stop failed: ${err.message}`);
      }
    }

    const sim = this.simulatedInstances.get(id);
    if (sim) {
      sim.state = 'stopping';
      sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] systemd[1]: Stopping OpenSSH Server...`);
      sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] systemd[1]: Stopped target Multi-User System.`);
    }

    setTimeout(() => {
      if (sim) sim.state = 'stopped';
      simulatedSshServer.stopServer(id);
      updateInstance(id, { state: 'stopped' });
    }, 2000);
  }

  /**
   * Reboot instance
   */
  public async rebootInstance(id: string, containerId: string | null): Promise<void> {
    updateInstance(id, { state: 'stopping' });

    if (containerId && !containerId.startsWith('sim-') && this.docker) {
      try {
        const container = this.docker.getContainer(containerId);
        await container.restart({ t: 3 });
      } catch (err: any) {
        console.warn(`[ComputeDriver] Container restart failed: ${err.message}`);
      }
    }

    const sim = this.simulatedInstances.get(id);
    if (sim) {
      sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] systemd[1]: Reboot requested by admin.`);
      sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] systemd[1]: System rebooting...`);
    }

    setTimeout(() => {
      if (sim) {
        sim.state = 'running';
        sim.logs.push(`[   ${((Date.now() - sim.launchTime) / 1000).toFixed(6)}] systemd[1]: System reboot complete.`);
      }
      updateInstance(id, { state: 'running' });
    }, 3000);
  }

  /**
   * Terminate instance
   */
  public async terminateInstance(id: string, containerId: string | null): Promise<void> {
    updateInstance(id, { state: 'shutting-down' });

    if (containerId && !containerId.startsWith('sim-') && this.docker) {
      try {
        const container = this.docker.getContainer(containerId);
        await container.stop({ t: 2 }).catch(() => {});
        await container.remove({ force: true }).catch(() => {});
      } catch (err: any) {
        console.warn(`[ComputeDriver] Container remove failed: ${err.message}`);
      }
    }

    const sim = this.simulatedInstances.get(id);
    if (sim) sim.state = 'shutting-down';

    setTimeout(() => {
      if (sim) sim.state = 'terminated';
      simulatedSshServer.stopServer(id);
      updateInstance(id, { state: 'terminated' });
    }, 2000);
  }

  /**
   * Poll telemetry metrics (CPU, RAM, Network I/O)
   */
  public async getInstanceStats(id: string, containerId: string | null): Promise<ComputeStats> {
    const inst = getInstanceById(id);
    if (!inst || inst.state !== 'running') {
      return { cpuPercent: 0, memoryUsageMb: 0, networkInKbps: 0, networkOutKbps: 0 };
    }

    if (containerId && !containerId.startsWith('sim-') && this.docker) {
      try {
        const container = this.docker.getContainer(containerId);
        const stats: any = await new Promise((resolve, reject) => {
          container.stats({ stream: false }, (err: any, data: any) => {
            if (err) reject(err);
            else resolve(data);
          });
        });

        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const onlineCpus = stats.cpu_stats.online_cpus || inst.vcpus;
        const cpuPercent = systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 2.5;

        const memoryUsage = stats.memory_stats.usage || 1024 * 1024 * 128;
        const memoryMb = Math.round(memoryUsage / (1024 * 1024));

        let netIn = 0;
        let netOut = 0;
        if (stats.networks) {
          for (const iface of Object.values(stats.networks) as any[]) {
            netIn += iface.rx_bytes || 0;
            netOut += iface.tx_bytes || 0;
          }
        }

        return {
          cpuPercent: Math.min(Math.max(parseFloat(cpuPercent.toFixed(1)), 0.5), 100),
          memoryUsageMb: memoryMb,
          networkInKbps: Math.round(netIn / 1024),
          networkOutKbps: Math.round(netOut / 1024),
        };
      } catch {
        // fallback to simulation stats
      }
    }

    // Realistic Simulated Telemetry with harmonic fluctuation
    const sim = this.simulatedInstances.get(id);
    const now = Date.now();
    const elapsedSeconds = sim ? (now - sim.launchTime) / 1000 : 60;

    // Periodic CPU spike every 45 seconds
    const spike = Math.sin(elapsedSeconds / 7) > 0.85 ? 20 + Math.random() * 25 : 0;
    const cpuBase = sim ? sim.baseCpu : 5;
    const cpuNoise = (Math.random() - 0.5) * 4;
    const cpuPercent = parseFloat(Math.min(Math.max(cpuBase + spike + cpuNoise, 0.8), 98).toFixed(1));

    // Memory slightly grows with runtime up to 60% of instance RAM
    const maxAllowedMem = inst.memoryMb * 0.75;
    const memBase = sim ? sim.baseMemory : Math.min(inst.memoryMb * 0.3, 250);
    const memWobble = Math.sin(elapsedSeconds / 20) * 15;
    const memoryUsageMb = Math.min(Math.round(memBase + memWobble), maxAllowedMem);

    // Network traffic noise
    const networkInKbps = Math.round(15 + Math.random() * 85 + (spike > 0 ? 120 : 0));
    const networkOutKbps = Math.round(8 + Math.random() * 45 + (spike > 0 ? 95 : 0));

    return {
      cpuPercent,
      memoryUsageMb,
      networkInKbps,
      networkOutKbps,
    };
  }

  /**
   * Retrieves instance boot and syslog
   */
  public async getContainerLogs(id: string, containerId: string | null): Promise<string> {
    if (containerId && !containerId.startsWith('sim-') && this.docker) {
      try {
        const container = this.docker.getContainer(containerId);
        const logBuf = await container.logs({
          stdout: true,
          stderr: true,
          tail: 200,
        });
        return logBuf.toString('utf-8');
      } catch (err: any) {
        console.warn(`[ComputeDriver] Could not fetch container logs: ${err.message}`);
      }
    }

    const sim = this.simulatedInstances.get(id);
    if (sim) {
      return sim.logs.join('\n');
    }

    const inst = getInstanceById(id);
    if (!inst) return 'No logs available.';

    let osUser = 'ubuntu';
    if (inst.amiId.includes('debian')) osUser = 'debian';
    if (inst.amiId.includes('alpine')) osUser = 'alpine';

    return this.generateBootLogs(inst, osUser).join('\n');
  }

  private generateBootLogs(inst: Instance, osUser: string, publicKey?: string): string[] {
    const lines = [
      `[    0.000000] Linux version 6.8.0-40-generic (nimbus-kernel@aws-nitro) #40-Ubuntu SMP PREEMPT`,
      `[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-6.8.0-40 root=UUID=nimbus-vol ro console=tty1 console=ttyS0 nvme_core.io_timeout=4294967295`,
      `[    0.024102] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'`,
      `[    0.052019] smpboot: CPU0: Intel(R) Xeon(R) Platinum 8375C CPU @ 2.90GHz (family: 0x6, model: 0x6a, stepping: 0x6)`,
      `[    0.180291] ACPI: Core revision 20230628`,
      `[    0.340912] Performance Events: PMU driver: intel, 8 counters`,
      `[    0.512390] Memory: ${inst.memoryMb}MB available (${Math.round(inst.memoryMb * 0.95)}MB free)`,
      `[    0.690184] Mount-cache hash table entries: 65536 (order: 7, 524288 bytes, linear)`,
      `[    0.892401] systemd[1]: Inserted module 'autofs4'`,
      `[    1.012490] systemd[1]: Detected architecture x86-64.`,
      `[    1.129381] cloud-init[412]: Cloud-init v. 24.1-0ubuntu1~24.04.1 running 'init-local'`,
      `[    1.391201] cloud-init[420]: Provisioned network: eth0 IPv4 ${inst.privateIp} MTU 9001`,
      `[    1.502910] cloud-init[438]: Created user account '${osUser}' with sudo privileges`,
    ];

    if (publicKey) {
      lines.push(
        `[    1.621940] cloud-init[442]: Injected authorized_keys into /home/${osUser}/.ssh/authorized_keys (mode 0600)`,
        `[    1.622104] cloud-init[442]: Injected authorized_keys into /root/.ssh/authorized_keys (mode 0600)`
      );
    } else {
      lines.push(`[    1.621940] cloud-init[442]: Notice: No SSH Key Pair specified. Password login disabled.`);
    }

    lines.push(
      `[    1.820190] systemd[1]: Starting OpenSSH Server Daemon...`,
      `[    1.901240] sshd[520]: Server listening on 0.0.0.0 port 22.`,
      `[    1.901312] sshd[520]: Server listening on :: port 22.`,
      `[    2.012901] systemd[1]: Started OpenSSH Server Daemon.`,
      `[    2.120934] systemd[1]: Startup finished in 2.120s (kernel 0.892s + userspace 1.228s).`,
      `[    2.121004] ElasticCloud Cloud-Init: Instance ${inst.id} is ready for connections.`
    );

    return lines;
  }
}

export const computeDriver = new ComputeDriver();
