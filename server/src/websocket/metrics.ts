// websocket/metrics.ts
// Live telemetry streaming WebSocket handler for CloudWatch-style area charts

import { WebSocket } from 'ws';
import { telemetryService } from '../services/telemetry';
import type { InstanceMetrics } from '@shared/types';

export function handleMetricsConnection(ws: WebSocket, instanceId: string): void {
  // Push initial telemetry snapshot immediately
  const initial = telemetryService.getMetrics(instanceId);
  ws.send(JSON.stringify({ type: 'metrics', data: initial }));

  // Listener for live metric ticks
  const onMetricsUpdate = (data: InstanceMetrics) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'metrics', data }));
    }
  };

  telemetryService.on(`metrics:${instanceId}`, onMetricsUpdate);

  ws.on('close', () => {
    telemetryService.off(`metrics:${instanceId}`, onMetricsUpdate);
  });
}
