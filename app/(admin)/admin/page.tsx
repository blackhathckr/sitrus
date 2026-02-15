/**
 * Admin Overview Dashboard Page
 *
 * Platform-wide statistics dashboard for Sitrus admins. Displays KPI cards
 * for creators, products, clicks, revenue, new signups, and pending payouts.
 * Below the KPIs, shows recent creators and pending payout requests.
 *
 * Server component that queries Prisma directly for optimal performance.
 *
 * @module app/(admin)/admin/page
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  ShoppingBag,
  MousePointerClick,
  IndianRupee,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// KPI CARDS SECTION
// =============================================================================

/**
 * Fetches platform-wide KPIs and renders six summary cards:
 * Total Creators, Total Products, Total Clicks, Revenue,
 * New Creators This Month, and Pending Payouts.
 */
async function AdminKPIs() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeCreators,
    activeProducts,
    totalClicksAgg,
    revenueAgg,
    newCreatorsThisMonth,
    pendingPayoutsAgg,
  ] = await Promise.all([
    // Active creators: users with role CREATOR and isActive true
    prisma.user.count({
      where: { role: 'CREATOR', isActive: true },
    }),

    // Active products
    prisma.product.count({
      where: { isActive: true },
    }),

    // Total clicks across all links (denormalized sum)
    prisma.link.aggregate({
      _sum: { totalClicks: true },
    }),

    // Revenue: sum of CONFIRMED + PAID earnings
    prisma.earning.aggregate({
      where: { status: { in: ['CONFIRMED', 'PAID'] } },
      _sum: { amount: true },
    }),

    // Creators registered this month
    prisma.user.count({
      where: {
        role: 'CREATOR',
        createdAt: { gte: startOfMonth },
      },
    }),

    // Pending payouts: count and total amount
    prisma.payout.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const totalClicks = totalClicksAgg._sum.totalClicks ?? 0;
  const revenue = revenueAgg._sum.amount ?? 0;
  const pendingPayoutCount = pendingPayoutsAgg._count.id;
  const pendingPayoutAmount = pendingPayoutsAgg._sum.amount ?? 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-3">
      <KPICard
        title="Total Creators"
        value={activeCreators}
        subtitle="Active creator accounts"
        trend={{
          value: 0,
          direction: activeCreators > 0 ? 'up' : 'stable',
          label: 'Active on platform',
        }}
      />
      <KPICard
        title="Total Products"
        value={activeProducts}
        subtitle="Active products in catalog"
        trend={{
          value: 0,
          direction: activeProducts > 0 ? 'up' : 'stable',
          label: 'Available for linking',
        }}
      />
      <KPICard
        title="Total Clicks"
        value={totalClicks.toLocaleString('en-IN')}
        subtitle="Across all affiliate links"
        trend={{
          value: 0,
          direction: totalClicks > 0 ? 'up' : 'stable',
          label: 'All time clicks',
        }}
      />
      <KPICard
        title="Revenue"
        value={`\u20B9${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="Confirmed + Paid earnings"
        trend={{
          value: 0,
          direction: revenue > 0 ? 'up' : 'stable',
          label: 'Total platform revenue',
        }}
      />
      <KPICard
        title="New Creators This Month"
        value={newCreatorsThisMonth}
        subtitle={`Since ${startOfMonth.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
        trend={{
          value: 0,
          direction: newCreatorsThisMonth > 0 ? 'up' : 'stable',
          label: 'Monthly signups',
        }}
      />
      <KPICard
        title="Pending Payouts"
        value={pendingPayoutCount}
        subtitle={`\u20B9${pendingPayoutAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`}
        trend={{
          value: 0,
          direction: pendingPayoutCount > 0 ? 'down' : 'stable',
          label: pendingPayoutCount > 0 ? 'Needs attention' : 'All clear',
        }}
      />
    </div>
  );
}

/** Loading skeleton for the KPI cards grid. */
function AdminKPIsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <KPICardSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// RECENT CREATORS SECTION
// =============================================================================

/**
 * Displays the 5 most recently registered creators with their
 * name, email, slug, approval status, and join date.
 */
async function RecentCreatorsSection() {
  const recentCreators = await prisma.user.findMany({
    where: { role: 'CREATOR' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      creatorProfile: {
        select: {
          slug: true,
          isApproved: true,
        },
      },
    },
  });

  if (recentCreators.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Creators</CardTitle>
          <CardDescription>No creators have signed up yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Creators will appear here once they register on the platform.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Creators</CardTitle>
        <CardDescription>Last 5 creator signups</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCreators.map((creator) => (
                <TableRow key={creator.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/creators/${creator.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {creator.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {creator.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {creator.creatorProfile?.slug ?? 'N/A'}
                    </code>
                  </TableCell>
                  <TableCell>
                    {creator.creatorProfile?.isApproved ? (
                      <Badge variant="default" className="text-xs">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(creator.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex justify-center">
          <Link
            href="/admin/creators"
            className="text-sm text-primary hover:underline"
          >
            View all creators
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PENDING PAYOUTS SECTION
// =============================================================================

/**
 * Displays the 5 most recent pending payout requests with
 * creator name, amount, and requested date.
 */
async function PendingPayoutsSection() {
  const pendingPayouts = await prisma.payout.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      amount: true,
      currency: true,
      createdAt: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (pendingPayouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Payouts</CardTitle>
          <CardDescription>No pending payout requests</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payout requests will appear here when creators submit them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Payouts</CardTitle>
        <CardDescription>Awaiting admin approval</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingPayouts.map((payout) => (
                <TableRow key={payout.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {payout.creator.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {payout.creator.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium tabular-nums">
                      {'\u20B9'}
                      {payout.amount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(payout.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex justify-center">
          <Link
            href="/admin/payouts"
            className="text-sm text-primary hover:underline"
          >
            View all payouts
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Loading skeleton for the tables section. */
function TablesSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div
                  key={j}
                  className="h-10 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

/**
 * Admin Overview Dashboard
 *
 * Server component that authenticates the admin session and renders
 * platform-wide KPI cards, recent creators, and pending payouts
 * using Suspense boundaries for progressive loading.
 */
export default async function AdminOverviewPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Platform overview and key metrics
        </p>
      </div>

      {/* KPI Cards */}
      <Suspense fallback={<AdminKPIsSkeleton />}>
        <AdminKPIs />
      </Suspense>

      {/* Recent Creators + Pending Payouts — Side by Side */}
      <Suspense fallback={<TablesSkeleton />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentCreatorsSection />
          <PendingPayoutsSection />
        </div>
      </Suspense>
    </div>
  );
}
