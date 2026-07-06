'use client';

/**
 * Distance and trip count over time chart component using Recharts.
 *
 * Renders an AreaChart showing total distance (km) and trip count
 * over time periods (weekly or monthly). Uses a gradient fill for
 * the distance area and a secondary line for trip count.
 *
 * **Validates: Requirements 14.2**
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Legend,
} from 'recharts';

export interface DistanceChartPoint {
  /** Label for the time period (e.g., "Jan", "Week 12") */
  label: string;
  /** Total distance in km for the period */
  distanceKm: number;
  /** Number of trips in the period */
  tripCount: number;
}

export interface DistanceChartProps {
  /** Chart data points */
  data: DistanceChartPoint[];
  /** Chart height in pixels (default: 250) */
  height?: number;
  /** Whether to use bar chart (default: false uses area chart) */
  useBarChart?: boolean;
}

export function DistanceChart({
  data,
  height = 250,
  useBarChart = false,
}: DistanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-xl border border-border bg-card/50">
        <p className="text-sm text-muted-foreground">No trip data available</p>
      </div>
    );
  }

  if (useBarChart) {
    return (
      <div className="w-full rounded-xl border border-border bg-card/50 p-4">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Distance &amp; Trips Over Time
        </h3>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.06)"
            />
            <XAxis
              dataKey="label"
              stroke="rgba(255, 255, 255, 0.4)"
              tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}
            />
            <YAxis
              yAxisId="distance"
              stroke="rgba(255, 255, 255, 0.4)"
              tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}
              tickFormatter={(value: number) => `${Math.round(value)}`}
            />
            <YAxis
              yAxisId="trips"
              orientation="right"
              stroke="rgba(255, 255, 255, 0.4)"
              tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: 12,
              }}
              formatter={(value, name) => {
                if (name === 'distanceKm') return [`${Number(value).toFixed(1)} km`, 'Distance'];
                return [`${value}`, 'Trips'];
              }}
            />
            <Legend
              wrapperStyle={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }}
            />
            <Bar
              yAxisId="distance"
              dataKey="distanceKm"
              name="Distance (km)"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
            <Bar
              yAxisId="trips"
              dataKey="tripCount"
              name="Trips"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card/50 p-4">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        Distance Over Time
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="distanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.06)"
          />
          <XAxis
            dataKey="label"
            stroke="rgba(255, 255, 255, 0.4)"
            tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.4)"
            tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}
            tickFormatter={(value: number) => `${Math.round(value)} km`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(value, name) => {
              if (name === 'distanceKm') return [`${Number(value).toFixed(1)} km`, 'Distance'];
              return [`${value}`, 'Trips'];
            }}
          />
          <Area
            type="monotone"
            dataKey="distanceKm"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#distanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
