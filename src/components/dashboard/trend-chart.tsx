'use client';

/**
 * TrendChart Component
 *
 * Displays trend data using a bar chart with multiple series.
 * Updated to match reference app styling.
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TrendDataPoint {
  period: string;
  [key: string]: string | number;
}

interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  series: TrendSeries[];
  title?: string;
  description?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-card p-3 shadow-md">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-medium">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function TrendChart({
  data,
  series,
  title = 'Trends',
  description,
  height = 250,
  showGrid = true,
  showLegend = true,
  className,
}: TrendChartProps) {
  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach((point) => {
      series.forEach((s) => {
        const value = point[s.key];
        if (typeof value === 'number' && value > max) {
          max = value;
        }
      });
    });
    return Math.ceil(max * 1.1) || 10;
  }, [data, series]);

  return (
    <Card className={cn('@container/card', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -10,
              bottom: 0,
            }}
          >
            {showGrid && (
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                className="stroke-border/50"
              />
            )}
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              domain={[0, maxValue]}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            )}
            {series.map((s, index) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={index === 0 ? 'var(--chart-5)' : 'var(--chart-2)'}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * TrendChartSkeleton Component
 *
 * Loading skeleton for trend chart.
 */
export function TrendChartSkeleton({
  height = 250,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <Card className={cn('@container/card', className)}>
      <CardHeader>
        <div className="h-5 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-40 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div
          className="w-full bg-muted animate-pulse rounded"
          style={{ height }}
        />
      </CardContent>
    </Card>
  );
}
