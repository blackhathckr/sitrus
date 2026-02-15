/**
 * Creator Dashboard Overview Page
 *
 * Main dashboard for Sitrus creators showing KPIs (SitLinks, clicks,
 * earnings, conversion rate), a 30-day click chart, recent links table,
 * and quick action shortcuts. All data is fetched server-side via Prisma.
 *
 * @module app/(dashboard)/dashboard/page
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { KPICard, KPICardSkeleton } from '@/components/dashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageLottie } from '@/components/ui/page-lottie';
import {
  ChevronRight,
  LinkIcon,
  MousePointerClick,
  Copy,
  ExternalLink,
  ShoppingBag,
  Store,
  Wallet,
} from 'lucide-react';
import { formatDistanceToNow, subDays, format, eachDayOfInterval, startOfDay } from 'date-fns';
import { ClickChart } from './click-chart';

// =============================================================================
// KPI CARDS SECTION
// =============================================================================

/**
 * Fetches and displays the four main KPI cards for the creator:
 * Total SitLinks, Total Clicks, Earnings, and Conversion Rate.
 *
 * All three queries run in parallel for optimal performance.
 */
async function DashboardKPIs({ creatorId }: { creatorId: string }) {
  const [linkCount, clickAgg, earningsAgg] = await Promise.all([
    prisma.link.count({
      where: { creatorId },
    }),
    prisma.link.aggregate({
      where: { creatorId },
      _sum: { totalClicks: true },
    }),
    prisma.earning.aggregate({
      where: {
        creatorId,
        status: { in: ['CONFIRMED', 'PAID'] },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalClicks = clickAgg._sum.totalClicks ?? 0;
  const totalEarnings = earningsAgg._sum.amount ?? 0;
  const conversionRate = linkCount > 0
    ? Math.round((totalClicks / linkCount) * 10) / 10
    : 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total SitLinks"
        value={linkCount}
        subtitle="Active affiliate links"
        trend={{
          value: 0,
          direction: 'stable',
          label: 'All time',
        }}
      />
      <KPICard
        title="Total Clicks"
        value={totalClicks}
        subtitle={`Across ${linkCount} links`}
        trend={{
          value: 0,
          direction: totalClicks > 0 ? 'up' : 'stable',
          label: totalClicks > 0 ? 'Clicks tracked' : 'No clicks yet',
        }}
      />
      <KPICard
        title="Earnings"
        value={`\u20B9${totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="Confirmed + Paid"
        trend={{
          value: 0,
          direction: totalEarnings > 0 ? 'up' : 'stable',
          label: totalEarnings > 0 ? 'Keep it up!' : 'Start earning',
        }}
      />
      <KPICard
        title="Conversion Rate"
        value={conversionRate}
        subtitle="Clicks per link"
        trend={{
          value: 0,
          direction: conversionRate > 5 ? 'up' : 'stable',
          label: 'Average engagement',
        }}
      />
    </div>
  );
}

/** Skeleton placeholder for the KPI cards grid. */
function DashboardKPIsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <KPICardSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// CLICK CHART SECTION
// =============================================================================

/**
 * Server-side data fetcher for the click chart.
 *
 * Fetches click data for the creator's links over the last 30 days,
 * groups by date, and passes the prepared data to the ClickChart
 * client component for rendering.
 */
async function ClickChartSection({ creatorId }: { creatorId: string }) {
  const thirtyDaysAgo = subDays(new Date(), 30);

  // Get all link IDs for this creator
  const creatorLinks = await prisma.link.findMany({
    where: { creatorId },
    select: { id: true },
  });

  const linkIds = creatorLinks.map((l) => l.id);

  if (linkIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Click Trends</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[300px] items-center justify-center">
          <PageLottie
            name="dashboard"
            description="No click data yet"
          />
        </CardContent>
      </Card>
    );
  }

  // Fetch clicks for the last 30 days
  const clicks = await prisma.click.findMany({
    where: {
      linkId: { in: linkIds },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Generate all dates in the 30-day interval
  const dateInterval = eachDayOfInterval({
    start: thirtyDaysAgo,
    end: new Date(),
  });

  // Group clicks by date
  const clicksByDate = new Map<string, number>();
  for (const click of clicks) {
    const dateKey = format(startOfDay(click.createdAt), 'yyyy-MM-dd');
    clicksByDate.set(dateKey, (clicksByDate.get(dateKey) ?? 0) + 1);
  }

  const chartData = dateInterval.map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return {
      date: dateKey,
      clicks: clicksByDate.get(dateKey) ?? 0,
    };
  });

  // If no clicks exist, show empty state
  if (clicks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Click Trends</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[300px] items-center justify-center">
          <PageLottie
            name="dashboard"
            description="No click data yet"
          />
        </CardContent>
      </Card>
    );
  }

  return <ClickChart data={chartData} />;
}

/** Skeleton placeholder for the click chart section. */
function ClickChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Click Trends</CardTitle>
        <CardDescription>Loading...</CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// RECENT LINKS TABLE SECTION
// =============================================================================

/**
 * Fetches and displays the 10 most recent SitLinks for the creator.
 *
 * Shows a table with product name (including marketplace badge),
 * copyable short URL, click count, and relative creation date.
 * When no links exist, shows an empty state with a CTA button.
 */
async function RecentLinksSection({ creatorId }: { creatorId: string }) {
  const links = await prisma.link.findMany({
    where: { creatorId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      product: {
        select: {
          title: true,
          marketplace: true,
          imageUrl: true,
        },
      },
    },
  });

  if (links.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent SitLinks</CardTitle>
          <CardDescription>Your latest affiliate links</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <PageLottie
            name="links"
            description="You haven't created any SitLinks yet"
            action={
              <Button asChild>
                <Link href="/dashboard/links">
                  <LinkIcon className="mr-2 size-4" />
                  Create SitLink
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent SitLinks</CardTitle>
        <CardDescription>Your latest affiliate links</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-[280px]">Product</TableHead>
                <TableHead>Short URL</TableHead>
                <TableHead className="text-center">Clicks</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">
                          {link.product.title}
                        </p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {link.product.marketplace}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000'}/api/r/{link.customAlias ?? link.shortCode}
                      </code>
                      <Copy className="size-3.5 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MousePointerClick className="size-3.5 text-muted-foreground" />
                      <span className="font-medium tabular-nums">
                        {link.totalClicks.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(link.createdAt, { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {links.length >= 10 && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/links">
                View all links
                <ExternalLink className="ml-2 size-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Skeleton placeholder for the recent links table. */
function RecentLinksSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent SitLinks</CardTitle>
        <CardDescription>Loading...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

/**
 * A single quick action link item with an icon, title, description,
 * and a trailing chevron indicator.
 */
function QuickActionItem({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

/**
 * Creator Dashboard Overview Page
 *
 * Server component that renders the full creator dashboard. Authenticates
 * the user, then renders KPI cards, click chart, recent links, and quick
 * actions using Suspense boundaries for streaming.
 *
 * Sections:
 * 1. Greeting header with the creator's first name
 * 2. Four KPI cards (SitLinks, Clicks, Earnings, Conversion Rate)
 * 3. 30-day click trend area chart
 * 4. Recent SitLinks table (last 10 links with product data)
 * 5. Quick action shortcuts (Create SitLink, Browse Products, etc.)
 */
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s how your SitLinks are performing
        </p>
      </div>

      {/* KPI Cards */}
      <Suspense fallback={<DashboardKPIsSkeleton />}>
        <DashboardKPIs creatorId={user.id} />
      </Suspense>

      {/* Click Chart — Full Width */}
      <Suspense fallback={<ClickChartSkeleton />}>
        <ClickChartSection creatorId={user.id} />
      </Suspense>

      {/* Recent Links Table — Full Width */}
      <Suspense fallback={<RecentLinksSkeleton />}>
        <RecentLinksSection creatorId={user.id} />
      </Suspense>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Jump to common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            <QuickActionItem
              title="Create SitLink"
              description="Generate a new affiliate link"
              href="/dashboard/links"
              icon={LinkIcon}
            />
            <QuickActionItem
              title="Browse Products"
              description="Discover products to promote"
              href="/dashboard/products"
              icon={ShoppingBag}
            />
            <QuickActionItem
              title="Manage Storefront"
              description="Customize your public page"
              href="/dashboard/storefront"
              icon={Store}
            />
            <QuickActionItem
              title="View Earnings"
              description="Track your commissions and payouts"
              href="/dashboard/earnings"
              icon={Wallet}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
