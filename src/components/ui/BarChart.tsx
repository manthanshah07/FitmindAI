import React from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface BarSeries {
  dataKey: string;
  name?: string;
  color?: string;
  radius?: [number, number, number, number];
}

export interface BarChartProps {
  data: Record<string, any>[];
  xAxisKey: string;
  series: BarSeries[];
  height?: number;
  className?: string;
  yAxisUnit?: string;
  ariaLabel?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xAxisKey,
  series,
  height = 240,
  className = '',
  yAxisUnit = '',
  ariaLabel = 'Bar chart',
}) => {
  const defaultColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`w-full overflow-hidden ${className}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, #27272a)" vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            stroke="var(--text-tertiary, #71717a)"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle, #27272a)' }}
          />
          <YAxis
            stroke="var(--text-tertiary, #71717a)"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle, #27272a)' }}
            unit={yAxisUnit}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-elevated, #1f1f23)',
              borderColor: 'var(--border-subtle, #27272a)',
              borderRadius: '8px',
              color: 'var(--text-primary, #fafafa)',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
            labelStyle={{ color: 'var(--text-secondary, #a1a1aa)', marginBottom: '4px' }}
          />
          {series.map((s, idx) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              fill={s.color || defaultColors[idx % defaultColors.length]}
              radius={s.radius || [4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};
