/**
 * Payout Management Page
 *
 * Admin page for reviewing and managing payout requests from creators.
 * Supports filtering by status, and approve/reject actions for pending
 * payouts. Uses the payouts API endpoints.
 *
 * Client component that fetches from GET /api/payouts (admin sees all)
 * and updates via PUT /api/payouts/[id].
 *
 * @module app/(admin)/admin/payouts/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Check, X, Loader2, IndianRupee } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLottie } from '@/components/ui/page-lottie';
import { TablePagination, PAGE_SIZE } from '@/components/ui/table-pagination';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// Types
// =============================================================================

/** Shape of a payout record returned by GET /api/payouts. */
interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  reference: string | null;
  processedAt: string | null;
  createdAt: string;
  approvedBy: string | null;
  creator: {
    name: string;
    email: string;
  };
}

/** API response shape from GET /api/payouts. */
interface PayoutsResponse {
  data: Payout[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/** All valid payout status values for filtering. */
const PAYOUT_STATUSES = [
  'ALL',
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
] as const;

type StatusFilter = (typeof PAYOUT_STATUSES)[number];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Returns the appropriate Badge variant and label styling for a payout status.
 *
 * @param status - The payout status string
 * @returns An object with variant and className for the Badge component
 */
function getStatusBadgeProps(status: string): {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className: string;
  label: string;
} {
  switch (status) {
    case 'PENDING':
      return {
        variant: 'secondary',
        className:
          'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
        label: 'Pending',
      };
    case 'APPROVED':
      return {
        variant: 'secondary',
        className:
          'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
        label: 'Approved',
      };
    case 'PROCESSING':
      return {
        variant: 'secondary',
        className:
          'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400',
        label: 'Processing',
      };
    case 'COMPLETED':
      return {
        variant: 'secondary',
        className:
          'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
        label: 'Completed',
      };
    case 'REJECTED':
      return {
        variant: 'destructive',
        className: '',
        label: 'Rejected',
      };
    default:
      return {
        variant: 'outline',
        className: '',
        label: status,
      };
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * AdminPayoutsPage
 *
 * Renders the payout management interface with:
 * - Status filter dropdown (All, Pending, Approved, Processing, Completed, Rejected)
 * - Table of all payouts with creator info, amount, status, method, and date
 * - Approve/Reject action buttons for PENDING payouts
 * - Loading and empty states via PageLottie
 */
export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  /**
   * Fetches payouts from the API with the current status filter applied.
   * Called on mount and whenever the status filter changes.
   */
  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
      });

      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/payouts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch payouts');
      }

      const json: PayoutsResponse = await response.json();
      setPayouts(json.data);
      setPagination(json.pagination);
    } catch (error) {
      console.error('[AdminPayouts] Fetch error:', error);
      toast.error('Failed to load payouts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  // Fetch payouts on mount and when status filter changes
  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  /**
   * Handles approving or rejecting a payout request.
   *
   * Sends a PUT request to /api/payouts/[id] with the action,
   * then updates the local state on success.
   *
   * @param payoutId - The ID of the payout to act upon
   * @param action - Either 'approve' or 'reject'
   */
  const handlePayoutAction = async (
    payoutId: string,
    action: 'approve' | 'reject'
  ) => {
    setActionLoading(payoutId);
    try {
      const response = await fetch(`/api/payouts/${payoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to ${action} payout`
        );
      }

      const json = await response.json();

      // Update local state with the returned payout data
      if (json.data) {
        setPayouts((prev) =>
          prev.map((payout) =>
            payout.id === payoutId
              ? { ...payout, ...json.data }
              : payout
          )
        );
      }

      toast.success(
        action === 'approve'
          ? 'Payout approved successfully'
          : 'Payout rejected successfully'
      );
    } catch (error) {
      console.error(`[AdminPayouts] ${action} error:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${action} payout. Please try again.`
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Compute summary amounts for the current filtered set
  const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = payouts.filter((p) => p.status === 'PENDING').length;

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
          <p className="text-muted-foreground">
            Manage creator payout requests
          </p>
        </div>
        <PageLottie name="payouts" description="Loading payouts..." />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground">
          Manage creator payout requests
        </p>
      </div>

      {/* Payout Management Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>
            {pagination.total} payout{pagination.total !== 1 ? 's' : ''}{' '}
            {statusFilter !== 'ALL'
              ? `with status "${statusFilter}"`
              : 'total'}
            {pendingCount > 0 && statusFilter === 'ALL' && (
              <> &mdash; {pendingCount} pending approval</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status Filter */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Status:
              </span>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                    setStatusFilter(value as StatusFilter);
                    setPage(1);
                  }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {PAYOUT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === 'ALL' ? 'All Statuses' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {payouts.length > 0 && (
              <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
                <IndianRupee className="size-3.5" />
                <span className="font-medium tabular-nums">
                  {totalAmount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span>total</span>
              </div>
            )}
          </div>

          {/* Empty State */}
          {payouts.length === 0 ? (
            <PageLottie
              name="payouts"
              description="No payout requests found"
            />
          ) : (
            /* Payouts Table */
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-[200px]">Creator</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => {
                    const statusProps = getStatusBadgeProps(payout.status);

                    return (
                      <TableRow
                        key={payout.id}
                        className="hover:bg-muted/50"
                      >
                        {/* Creator */}
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm">
                              {payout.creator.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {payout.creator.email}
                            </p>
                          </div>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-right">
                          <span className="font-medium tabular-nums">
                            {'\u20B9'}
                            {payout.amount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="text-center">
                          <Badge
                            variant={statusProps.variant}
                            className={statusProps.className}
                          >
                            {statusProps.label}
                          </Badge>
                        </TableCell>

                        {/* Method */}
                        <TableCell>
                          {payout.method ? (
                            <span className="text-sm capitalize">
                              {payout.method.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">
                              --
                            </span>
                          )}
                        </TableCell>

                        {/* Requested Date */}
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(payout.createdAt),
                            { addSuffix: true }
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {payout.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-2">
                              {/* Approve Button */}
                              <Button
                                variant="default"
                                size="sm"
                                disabled={actionLoading === payout.id}
                                onClick={() =>
                                  handlePayoutAction(payout.id, 'approve')
                                }
                              >
                                {actionLoading === payout.id ? (
                                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                                ) : (
                                  <Check className="mr-1 size-3.5" />
                                )}
                                Approve
                              </Button>

                              {/* Reject Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === payout.id}
                                onClick={() =>
                                  handlePayoutAction(payout.id, 'reject')
                                }
                              >
                                {actionLoading === payout.id ? (
                                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                                ) : (
                                  <X className="mr-1 size-3.5" />
                                )}
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {payout.processedAt
                                ? `Processed ${formatDistanceToNow(new Date(payout.processedAt), { addSuffix: true })}`
                                : '--'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <TablePagination
            pagination={pagination}
            label="payouts"
            onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setPage((p) => p + 1)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
