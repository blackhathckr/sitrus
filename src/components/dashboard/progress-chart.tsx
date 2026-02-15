'use client';

/**
 * ProgressChart Component
 *
 * Displays progress over time using an area chart with gradient fill.
 * Updated to match reference app styling.
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProgressDataPoint {
  date: string;
  progress: number;
  completed?: number;
  total?: number;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  title?: string;
  description?: string;
  height?: number;
  showGrid?: boolean;
  className?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProgressDataPoint;
    return (
      <div className="rounded-lg border bg-card p-3 shadow-md">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          Progress: <span className="font-medium text-foreground">{data.progress}%</span>
        </p>
        {data.completed !== undefined && data.total !== undefined && (
          <p className="text-xs text-muted-foreground">
            {data.completed} of {data.total} completed
          </p>
        )}
      </div>
    );
  }
  return null;
}

export function ProgressChart({
  data,
  title = 'Progress Over Time',
  description,
  height = 250,
  showGrid = true,
  className,
}: ProgressChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      progress: Math.min(100, Math.max(0, point.progress)),
    }));
  }, [data]);

  return (
    <Card className={cn('@container/card', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: -10,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            {showGrid && (
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                className="stroke-border/50"
              />
            )}
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Area
              type="natural"
              dataKey="progress"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#progressGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * ProgressChartSkeleton Component
 *
 * Loading skeleton for progress chart.
 */
export function ProgressChartSkeleton({
  height = 250,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <Card className={cn('@container/card', className)}>
      <CardHeader>
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
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
