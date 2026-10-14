// components/monitoring/MetricsChart.tsx
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { MetricDataPoint } from '@shared/types';

interface MetricsChartProps {
  title: string;
  data: MetricDataPoint[];
  unit: string;
  color?: string;
  domain?: [number | string, number | string];
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  data,
  unit,
  color = '#ff9900', // AWS Orange default
  domain = [0, 'auto'],
}) => {
  const formattedData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: d.value,
  }));

  const latestVal = data.length > 0 ? data[data.length - 1].value : 0;
  const gradientId = `grad-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="bg-console-surface border border-console-border rounded-lg p-3.5 flex flex-col shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-console-text uppercase tracking-wider">{title}</h4>
        <span className="text-sm font-mono font-bold text-console-text">
          {latestVal} <span className="text-xs font-normal text-console-text-muted">{unit}</span>
        </span>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--console-border)" opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'var(--console-text-muted)' }}
              stroke="var(--console-border)"
              interval="preserveStartEnd"
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 10, fill: 'var(--console-text-muted)' }}
              stroke="var(--console-border)"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--console-surface)',
                borderColor: 'var(--console-border)',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--console-text)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any) => [`${value} ${unit}`, title]}
              labelStyle={{ color: 'var(--console-text-muted)' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
