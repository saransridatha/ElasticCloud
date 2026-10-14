// services/telemetry.ts
// Metrics telemetry collection, historical buffer, and subscriber broadcast

import EventEmitter from 'events';
import { getAllInstances } from '../db';
import { computeDriver } from './compute-driver';
import type { InstanceMetrics, MetricDataPoint } from '@shared/types';

const MAX_HISTORY = 60; // Keep last 60 data points (5 minutes at 5s interval)

export class TelemetryService extends EventEmitter {
  private history = new Map<
    string,
    {
      cpu: MetricDataPoint[];
      memory: MetricDataPoint[];
      netIn: MetricDataPoint[];
      netOut: MetricDataPoint[];
      diskRead: MetricDataPoint[];
      diskWrite: MetricDataPoint[];
    }
  >();

  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  public start(intervalMs = 5000): void {
    if (this.pollInterval) return;
    this.poll();
    this.pollInterval = setInterval(() => this.poll(), intervalMs);
    console.log(`[TelemetryService] Polling started (interval: ${intervalMs}ms)`);
  }

  public stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async poll(): Promise<void> {
    const instances = getAllInstances().filter((i) => i.state === 'running');
    const nowIso = new Date().toISOString();

    for (const inst of instances) {
      try {
        const stats = await computeDriver.getInstanceStats(inst.id, inst.containerId);
        let series = this.history.get(inst.id);
        if (!series) {
          series = {
            cpu: [],
            memory: [],
            netIn: [],
            netOut: [],
            diskRead: [],
            diskWrite: [],
          };
          // Pre-populate with a few initial data points for smooth UI rendering
          const nowMs = Date.now();
          for (let i = 10; i > 0; i--) {
            const pastIso = new Date(nowMs - i * 5000).toISOString();
            series.cpu.push({ timestamp: pastIso, value: Math.max(stats.cpuPercent - (Math.random() * 2), 0.5) });
            series.memory.push({ timestamp: pastIso, value: Math.max(stats.memoryUsageMb - Math.round(Math.random() * 4), 50) });
            series.netIn.push({ timestamp: pastIso, value: Math.max(stats.networkInKbps - Math.round(Math.random() * 10), 0) });
            series.netOut.push({ timestamp: pastIso, value: Math.max(stats.networkOutKbps - Math.round(Math.random() * 5), 0) });
            series.diskRead.push({ timestamp: pastIso, value: Math.round(Math.random() * 20) });
            series.diskWrite.push({ timestamp: pastIso, value: Math.round(Math.random() * 15) });
          }
          this.history.set(inst.id, series);
        }

        const pushDataPoint = (arr: MetricDataPoint[], val: number) => {
          arr.push({ timestamp: nowIso, value: val });
          if (arr.length > MAX_HISTORY) arr.shift();
        };

        pushDataPoint(series.cpu, stats.cpuPercent);
        pushDataPoint(series.memory, stats.memoryUsageMb);
        pushDataPoint(series.netIn, stats.networkInKbps);
        pushDataPoint(series.netOut, stats.networkOutKbps);
        pushDataPoint(series.diskRead, Math.round(5 + Math.random() * 25));
        pushDataPoint(series.diskWrite, Math.round(2 + Math.random() * 15));

        const updatedMetrics = this.getMetrics(inst.id);
        this.emit(`metrics:${inst.id}`, updatedMetrics);
      } catch (err: any) {
        console.error(`[TelemetryService] Error collecting metrics for ${inst.id}:`, err.message);
      }
    }
  }

  public getMetrics(instanceId: string): InstanceMetrics {
    const series = this.history.get(instanceId);
    if (!series) {
      const nowIso = new Date().toISOString();
      return {
        instanceId,
        cpuUtilization: [{ timestamp: nowIso, value: 0 }],
        memoryUsageMb: [{ timestamp: nowIso, value: 0 }],
        networkInKbps: [{ timestamp: nowIso, value: 0 }],
        networkOutKbps: [{ timestamp: nowIso, value: 0 }],
        diskReadOps: [{ timestamp: nowIso, value: 0 }],
        diskWriteOps: [{ timestamp: nowIso, value: 0 }],
      };
    }

    return {
      instanceId,
      cpuUtilization: [...series.cpu],
      memoryUsageMb: [...series.memory],
      networkInKbps: [...series.netIn],
      networkOutKbps: [...series.netOut],
      diskReadOps: [...series.diskRead],
      diskWriteOps: [...series.diskWrite],
    };
  }
}

export const telemetryService = new TelemetryService();
