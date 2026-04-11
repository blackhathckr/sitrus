/**
 * Earnings Page
 *
 * Displays an earnings overview for the authenticated creator including
 * KPI summary cards (total earned, pending, this month, available for
 * payout), a detailed earnings table, and a "Request Payout" dialog.
 *
 * @module dashboard/earnings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { IndianRupee, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLottie } from '@/components/ui/page-lottie';
import { TablePagination, PAGE_SIZE, type PaginationData } from '@/components/ui/table-pagination';
import { KPICard } from '@/components/dashboard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Summary data returned by GET /api/earnings/summary.
 *
 * The API returns pre-aggregated totals for each earning status along
 * with an overall total (confirmed + paid) and current-period earnings.
 */
interface EarningsSummary {
  creatorId: string;
  pending: number;
  confirmed: number;
  paid: number;
  cancelled: number;
  overallTotal: number;
  outstandingPayouts: number;
  availableForPayout: number;
  currentPeriod: {
    period: string;
    amount: number;
  };
}

/** A single payout record from GET /api/payouts. */
interface Payout {
  id: string;
  creatorId: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  reference: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A single earning record from GET /api/earnings. */
interface Earning {
  id: string;
  creatorId: string;
  linkId: string | null;
  amount: number;
  currency: string;
  status: string;
  period: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  link: {
    shortCode: string;
    product: { title: string } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum confirmed balance (in INR) required to request a payout. */
const MIN_PAYOUT_AMOUNT = 100;

/** Map earning statuses to badge colour classes. */
const STATUS_COLORS: Record<string, string> = {
  PENDING:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PAID:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

/** Map payout statuses to badge colour classes. */
const PAYOUT_STATUS_COLORS: Record<string, string> = {
  PENDING:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  COMPLETED:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a number as an Indian Rupee string with the Rupee sign.
 * Uses the Indian locale for proper grouping (e.g. 1,23,456).
 */
function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an ISO date string into a short human-readable format.
 */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EarningsPage() {
  // ---- State ---------------------------------------------------------------
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [earningsPagination, setEarningsPagination] = useState<PaginationData | null>(null);
  const [earningsPage, setEarningsPage] = useState(1);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  // ---- Data fetching -------------------------------------------------------

  /**
   * Fetches the earnings summary from GET /api/earnings/summary.
   */
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/earnings/summary');
      if (!res.ok) throw new Error('Failed to fetch summary');
      const json = await res.json();
      setSummary(json.data);
    } catch (err) {
      console.error('[Earnings] fetchSummary error:', err);
      toast.error('Failed to load earnings summary');
    }
  }, []);

  /**
   * Fetches the list of earnings from GET /api/earnings.
   */
  const fetchEarnings = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(earningsPage),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/earnings?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch earnings');
      const json = await res.json();
      setEarnings(json.data);
      setEarningsPagination(json.pagination);
    } catch (err) {
      console.error('[Earnings] fetchEarnings error:', err);
      toast.error('Failed to load earnings');
    }
  }, [earningsPage]);

  /**
   * Fetches payout history from GET /api/payouts.
   */
  const fetchPayouts = useCallback(async () => {
    try {
      const res = await fetch('/api/payouts');
      if (!res.ok) throw new Error('Failed to fetch payouts');
      const json = await res.json();
      setPayouts(json.data);
    } catch (err) {
      console.error('[Earnings] fetchPayouts error:', err);
    }
  }, []);

  /** Load summary, earnings and payouts in parallel on mount. */
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await Promise.all([fetchSummary(), fetchEarnings(), fetchPayouts()]);
      setIsLoading(false);
    }
    load();
  }, [fetchSummary, fetchEarnings, fetchPayouts]);

  /** Refetch earnings when page changes (after initial load). */
  useEffect(() => {
    if (!isLoading) {
      fetchEarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earningsPage]);

  // ---- Handlers ------------------------------------------------------------

  /**
   * Submits a payout request via POST /api/payouts.
   * Validates that the requested amount meets the minimum threshold and
   * does not exceed available confirmed earnings before making the call.
   */
  const handleRequestPayout = useCallback(async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount < MIN_PAYOUT_AMOUNT) {
      toast.error(`Minimum payout amount is ${formatINR(MIN_PAYOUT_AMOUNT)}`);
      return;
    }
    if (summary && amount > summary.availableForPayout) {
      toast.error(
        `Amount exceeds available balance of ${formatINR(summary.availableForPayout)}`,
      );
      return;
    }

    setIsRequesting(true);
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to request payout');
      }

      toast.success('Payout request submitted successfully');
      setPayoutDialogOpen(false);
      setPayoutAmount('');
      // Refresh data to reflect updated balances
      await Promise.all([fetchSummary(), fetchEarnings(), fetchPayouts()]);
    } catch (err) {
      console.error('[Earnings] handleRequestPayout error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to request payout',
      );
    } finally {
      setIsRequesting(false);
    }
  }, [payoutAmount, summary, fetchSummary, fetchEarnings, fetchPayouts]);

  // ---- Loading state -------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <PageLottie name="earnings" description="Loading your earnings..." />
      </div>
    );
  }

  // ---- Derived values ------------------------------------------------------

  const totalEarned = summary?.overallTotal ?? 0;
  const pendingAmount = summary?.pending ?? 0;
  const thisMonth = summary?.currentPeriod?.amount ?? 0;
  const availableForPayout = summary?.availableForPayout ?? 0;
  const canRequestPayout = availableForPayout >= MIN_PAYOUT_AMOUNT;

  // ---- Render --------------------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
          <p className="text-muted-foreground">
            Track your commissions and request payouts
          </p>
        </div>

        {/* Payout dialog */}
        <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canRequestPayout} className="gap-1.5">
              <IndianRupee className="size-4" />
              Request Payout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Payout</DialogTitle>
              <DialogDescription>
                Enter the amount you would like to withdraw. You have{' '}
                <span className="font-medium text-foreground">
                  {formatINR(availableForPayout)}
                </span>{' '}
                available for payout.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="payout-amount">Amount (INR)</Label>
                <Input
                  id="payout-amount"
                  type="number"
                  min={MIN_PAYOUT_AMOUNT}
                  max={availableForPayout}
                  step="1"
                  placeholder={`Min ${MIN_PAYOUT_AMOUNT}`}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum payout: {formatINR(MIN_PAYOUT_AMOUNT)}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPayoutDialogOpen(false)}
                disabled={isRequesting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestPayout}
                disabled={isRequesting}
                className="gap-1.5"
              >
                {isRequesting && <Loader2 className="size-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ================================================================ */}
      {/* KPI Summary Cards                                                */}
      {/* ================================================================ */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Earned"
          value={formatINR(totalEarned)}
          subtitle="Confirmed + paid"
          icon="check-circle"
          trend={{
            value: 0,
            direction: totalEarned > 0 ? 'up' : 'stable',
            label: 'Lifetime earnings',
          }}
        />
        <KPICard
          title="Pending"
          value={formatINR(pendingAmount)}
          subtitle="Awaiting confirmation"
          icon="clock"
          trend={{
            value: 0,
            direction: 'stable',
            label: 'Not yet confirmed',
          }}
        />
        <KPICard
          title="This Month"
          value={formatINR(thisMonth)}
          subtitle={summary?.currentPeriod?.period ?? ''}
          icon="bar-chart"
          trend={{
            value: 0,
            direction: thisMonth > 0 ? 'up' : 'stable',
            label: 'Current period',
          }}
        />
        <KPICard
          title="Available for Payout"
          value={formatINR(availableForPayout)}
          subtitle={
            canRequestPayout
              ? 'Ready to withdraw'
              : `Min ${formatINR(MIN_PAYOUT_AMOUNT)} required`
          }
          icon="target"
          trend={{
            value: 0,
            direction: canRequestPayout ? 'up' : 'stable',
            label: canRequestPayout ? 'Payout eligible' : 'Below threshold',
          }}
        />
      </div>

      {/* ================================================================ */}
      {/* Earnings Table                                                   */}
      {/* ================================================================ */}
      {earnings.length === 0 ? (
        <PageLottie
          name="earnings"
          description="Start earning by sharing SitLinks"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
            <CardDescription>
              A detailed log of all your commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Link / Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {earning.period}
                      </TableCell>
                      <TableCell>
                        {earning.link ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {earning.link.product?.title ?? 'Unknown Product'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              /{earning.link.shortCode}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatINR(earning.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${STATUS_COLORS[earning.status] ?? ''}`}
                        >
                          {earning.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(earning.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {earningsPagination && (
              <TablePagination
                pagination={earningsPagination}
                label="earnings"
                onPreviousPage={() => setEarningsPage((p) => Math.max(1, p - 1))}
                onNextPage={() => setEarningsPage((p) => p + 1)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Payout History                                                   */}
      {/* ================================================================ */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>
              Track the status of your payout requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm">
                        {formatDate(payout.createdAt)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatINR(payout.amount)}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {payout.method?.replace('_', ' ') ?? '--'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${PAYOUT_STATUS_COLORS[payout.status] ?? ''}`}
                        >
                          {payout.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {payout.reference ?? '--'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {payout.processedAt ? formatDate(payout.processedAt) : '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
