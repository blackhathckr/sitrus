/**
 * Platform Analytics Page
 *
 * Admin page for viewing platform-wide analytics. Displays click trends
 * over time as an area chart, top creators by clicks, top products by
 * clicks, and device distribution.
 *
 * Client component that fetches from GET /api/admin/analytics.
 *
 * @module app/(admin)/admin/analytics/page
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageLottie } from '@/components/ui/page-lottie';

// =============================================================================
// Types
// =============================================================================

/** Analytics data returned by the admin analytics API. */
interface AnalyticsData {
  dateRange: { from: string; to: string };
  clicksOverTime: Array<{ date: string; count: number }>;
  topCreators: Array<{
    creatorId: string;
    name: string;
    email: string;
    totalClicks: number;
  }>;
  topProducts: Array<{
    productId: string;
    title: string;
    totalClicks: number;
  }>;
  geoDistribution: Array<{ country: string; count: number }>;
  deviceDistribution: Array<{ device: string; count: number }>;
}

/** API response shape from GET /api/admin/analytics. */
interface AnalyticsResponse {
  data: AnalyticsData;
}

// =============================================================================
// Chart Configs
// =============================================================================

/** Chart configuration for the clicks-over-time area chart. */
const clicksChartConfig = {
  count: {
    label: 'Clicks',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

/** Chart configuration for the device distribution bar chart. */
const deviceChartConfig = {
  clicks: {
    label: 'Clicks',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

// =============================================================================
// Component
// =============================================================================

/**
 * AdminAnalyticsPage
 *
 * Renders the platform analytics dashboard with:
 * - Clicks over time area chart (last 30 days by default)
 * - Top 10 creators by clicks table
 * - Top 10 products by clicks table
 * - Device distribution bar chart
 * - Loading state via PageLottie
 */
export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches analytics data from the admin API on mount.
   * Defaults to the last 30 days if no custom date range is specified.
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/analytics');

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const json: AnalyticsResponse = await response.json();

        if (!cancelled) {
          setAnalytics(json.data);
        }
      } catch (err) {
        console.error('[AdminAnalytics] Fetch error:', err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Platform Analytics
          </h1>
          <p className="text-muted-foreground">
            Platform-wide performance metrics
          </p>
        </div>
        <PageLottie name="analytics" description="Loading analytics..." />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error State
  // -------------------------------------------------------------------------

  if (error || !analytics) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Platform Analytics
          </h1>
          <p className="text-muted-foreground">
            Platform-wide performance metrics
          </p>
        </div>
        <Card>
          <CardContent className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {error ?? 'Failed to load analytics data.'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compute total clicks for display
  const totalClicks = analytics.clicksOverTime.reduce(
    (sum, day) => sum + day.count,
    0
  );

  // Transform device data for bar chart
  const deviceChartData = analytics.deviceDistribution.map((item) => ({
    device: item.device,
    clicks: item.count,
  }));

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground">
          Platform-wide performance metrics &mdash; Last 30 days
        </p>
      </div>

      {/* Clicks Over Time — Area Chart */}
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Clicks Over Time</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Daily click volume across all affiliate links &mdash;{' '}
              {totalClicks.toLocaleString('en-IN')} total clicks
            </span>
            <span className="@[540px]/card:hidden">
              {totalClicks.toLocaleString('en-IN')} total clicks
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {analytics.clicksOverTime.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No click data available for the selected period.
              </p>
            </div>
          ) : (
            <ChartContainer
              config={clicksChartConfig}
              className="aspect-auto h-[300px] w-full"
            >
              <AreaChart data={analytics.clicksOverTime}>
                <defs>
                  <linearGradient
                    id="fillPlatformClicks"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-count)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-count)"
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
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={48}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="count"
                  type="natural"
                  fill="url(#fillPlatformClicks)"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Creators + Top Products — Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Creators Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Creators</CardTitle>
            <CardDescription>Top 10 by clicks in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topCreators.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No creator click data available.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.topCreators.map((creator, index) => (
                      <TableRow
                        key={creator.creatorId}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <Badge
                            variant={index < 3 ? 'default' : 'secondary'}
                            className="size-6 items-center justify-center rounded-full p-0 text-xs"
                          >
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm">
                              {creator.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {creator.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {creator.totalClicks.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Top 10 by clicks in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No product click data available.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.topProducts.map((product, index) => (
                      <TableRow
                        key={product.productId}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <Badge
                            variant={index < 3 ? 'default' : 'secondary'}
                            className="size-6 items-center justify-center rounded-full p-0 text-xs"
                          >
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="truncate font-medium text-sm max-w-[200px]">
                            {product.title}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {product.totalClicks.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Distribution + Geo Distribution — Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device Distribution — Bar Chart */}
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
            <CardDescription>
              Click breakdown by device type
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            {deviceChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No device data available.
              </p>
            ) : (
              <ChartContainer
                config={deviceChartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <BarChart data={deviceChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="device"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={48}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar
                    dataKey="clicks"
                    fill="var(--color-clicks)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Geo Distribution — Table */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Click volume by country</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.geoDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No geographic data available.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.geoDistribution
                      .slice(0, 10)
                      .map((geo) => (
                        <TableRow
                          key={geo.country}
                          className="hover:bg-muted/50"
                        >
                          <TableCell className="font-medium text-sm">
                            {geo.country}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {geo.count.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
