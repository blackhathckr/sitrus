'use client';

/**
 * Click Chart Client Component
 *
 * Renders a 30-day click trend area chart using recharts.
 * Extracted as a client component because recharts requires browser APIs.
 *
 * @module app/(dashboard)/dashboard/click-chart
 */

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const clickChartConfig = {
  clicks: {
    label: 'Clicks',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

interface ClickChartProps {
  data: Array<{ date: string; clicks: number }>;
}

/**
 * Renders a 30-day click trend area chart with gradient fill.
 *
 * @param data - Array of { date, clicks } entries, one per day
 */
export function ClickChart({ data }: ClickChartProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Click Trends</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Daily clicks across all your SitLinks over the last 30 days
          </span>
          <span className="@[540px]/card:hidden">Last 30 days</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={clickChartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-clicks)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-clicks)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="clicks"
              type="natural"
              fill="url(#fillClicks)"
              stroke="var(--color-clicks)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
