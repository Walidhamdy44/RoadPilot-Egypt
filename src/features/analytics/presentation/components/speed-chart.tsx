'use client';

/**
 * Speed-over-time line chart component using Recharts.
 *
 * Renders a LineChart showing speed (km/h) on the Y-axis and
 * time (minutes from trip start) on the X-axis. Designed for
 * dark-mode-first display with a blue line.
 *
 * **Validates: Requirements 13.3, 13.5**
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SpeedChartPoint } from '@/features/analytics/domain/analytics-engine';

export interface SpeedChartProps {
  /** Speed chart data points (time in minutes, speed in km/h) */
  data: SpeedChartPoint[];
  /** Optional height in pixels (default: 250) */
  height?: number;
}

export function SpeedChart({ data, height = 250 }: SpeedChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-xl border border-border bg-card/50">
        <p className="text-sm text-muted-foreground">No speed data available</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card/50 p-4">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        Speed Over Time
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.06)"
          />
          <XAxis
            dataKey="timeMinutes"
            stroke="rgba(255, 255, 255, 0.4)"
            tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}
            tickFormatter={(value: number) => `${Math.round(value)}m`}
            label={{
              value: 'Time (min)',
              position: 'insideBottom',
              offset: -2,
              style: { fill: 'rgba(255, 255, 255, 0.5)', fontSize: 10 },
            }}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.4)"
            tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}
            tickFormatter={(value: number) => `${Math.round(value)}`}
            label={{
              value: 'km/h',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'rgba(255, 255, 255, 0.5)', fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value).toFixed(1)} km/h`, 'Speed']}
            labelFormatter={(label) => `${Number(label).toFixed(1)} min`}
          />
          <Line
            type="monotone"
            dataKey="speedKmh"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
