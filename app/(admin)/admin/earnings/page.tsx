/**
 * Admin Earnings Management Page
 *
 * Allows admins to view all creator earnings, filter by status/creator,
 * and manually create new earning records for creators.
 *
 * @module app/(admin)/admin/earnings/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLottie } from '@/components/ui/page-lottie';
import { TablePagination, PAGE_SIZE, type PaginationData } from '@/components/ui/table-pagination';

// =============================================================================
// Types
// =============================================================================

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
  link: {
    shortCode: string;
    product: { title: string } | null;
  } | null;
  creator: {
    name: string;
    email: string;
  };
}

interface Creator {
  id: string;
  name: string;
  email: string;
}

interface CreatorLink {
  id: string;
  shortCode: string;
  product: { title: string } | null;
}

// =============================================================================
// Constants
// =============================================================================

const EARNING_STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'PAID', 'CANCELLED'] as const;
type StatusFilter = (typeof EARNING_STATUSES)[number];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  CONFIRMED: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  PAID: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
  CANCELLED: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
};

// =============================================================================
// Helpers
// =============================================================================

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// =============================================================================
// Component
// =============================================================================

export default function AdminEarningsPage() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [creatorFilter, setCreatorFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for creating a new earning
  const [form, setForm] = useState({
    creatorId: '',
    linkId: '',
    amount: '',
    status: 'PENDING',
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    description: '',
  });

  // Creator's links for the selected creator in the form
  const [creatorLinks, setCreatorLinks] = useState<CreatorLink[]>([]);

  // ---- Data fetching --------------------------------------------------------

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (creatorFilter !== 'ALL') params.set('creatorId', creatorFilter);

      const res = await fetch(`/api/earnings?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch earnings');
      const json = await res.json();
      setEarnings(json.data);
      setPagination(json.pagination);
    } catch (err) {
      console.error('[AdminEarnings] fetch error:', err);
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, creatorFilter, page]);

  const fetchCreators = useCallback(async () => {
    try {
      const res = await fetch('/api/creators');
      if (!res.ok) return;
      const json = await res.json();
      setCreators(
        (json.data || []).map((c: { id: string; name: string; email: string }) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }))
      );
    } catch {
      // Non-critical
    }
  }, []);

  const fetchCreatorLinks = useCallback(async (creatorId: string) => {
    try {
      const res = await fetch(`/api/links?creatorId=${creatorId}&limit=100`);
      if (!res.ok) return;
      const json = await res.json();
      setCreatorLinks(
        (json.data || []).map((l: { id: string; shortCode: string; product: { title: string } | null }) => ({
          id: l.id,
          shortCode: l.shortCode,
          product: l.product,
        }))
      );
    } catch {
      setCreatorLinks([]);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  // When creator changes in form, fetch their links
  useEffect(() => {
    if (form.creatorId) {
      fetchCreatorLinks(form.creatorId);
    } else {
      setCreatorLinks([]);
    }
  }, [form.creatorId, fetchCreatorLinks]);

  // ---- Handlers -------------------------------------------------------------

  const handleCreate = async () => {
    const amount = parseFloat(form.amount);
    if (!form.creatorId) {
      toast.error('Select a creator');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: form.creatorId,
          linkId: form.linkId || undefined,
          amount,
          status: form.status,
          period: form.period,
          description: form.description || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to create earning');
      }

      toast.success('Earning created successfully');
      setDialogOpen(false);
      setForm({
        creatorId: '',
        linkId: '',
        amount: '',
        status: 'PENDING',
        period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        description: '',
      });
      await fetchEarnings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create earning');
    } finally {
      setIsCreating(false);
    }
  };

  // ---- Computed values ------------------------------------------------------

  const totalAmount = earnings.reduce((sum, e) => sum + e.amount, 0);

  // ---- Render ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
          <p className="text-muted-foreground">Manage creator earnings</p>
        </div>
        <PageLottie name="earnings" description="Loading earnings..." />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
          <p className="text-muted-foreground">Manage creator earnings</p>
        </div>

        {/* Create Earning Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="size-4" />
              Add Earning
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Earning</DialogTitle>
              <DialogDescription>
                Manually create an earning record for a creator.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Creator */}
              <div className="space-y-2">
                <Label>Creator</Label>
                <Select
                  value={form.creatorId}
                  onValueChange={(v) => setForm((f) => ({ ...f, creatorId: v, linkId: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select creator" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Link (optional) */}
              {creatorLinks.length > 0 && (
                <div className="space-y-2">
                  <Label>Link (optional)</Label>
                  <Select
                    value={form.linkId}
                    onValueChange={(v) => setForm((f) => ({ ...f, linkId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select link (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific link</SelectItem>
                      {creatorLinks.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          /{l.shortCode} — {l.product?.title ?? 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (INR)</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 249.95"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period */}
              <div className="space-y-2">
                <Label>Period (YYYY-MM)</Label>
                <Input
                  placeholder="e.g. 2026-02"
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="e.g. Commission for Nike Air Max sale"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating} className="gap-1.5">
                {isCreating && <Loader2 className="size-4 animate-spin" />}
                Create Earning
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Earnings Card */}
      <Card>
        <CardHeader>
          <CardTitle>All Earnings</CardTitle>
          <CardDescription>
            {pagination?.total ?? earnings.length} earning{(pagination?.total ?? earnings.length) !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <Select
                value={statusFilter}
                onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EARNING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'ALL' ? 'All Statuses' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Creator:</span>
              <Select
                value={creatorFilter}
                onValueChange={(v) => { setCreatorFilter(v); setPage(1); }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Creators</SelectItem>
                  {creators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {earnings.length > 0 && (
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

          {/* Table or Empty State */}
          {earnings.length === 0 ? (
            <PageLottie name="earnings" description="No earnings found" />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Link / Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{earning.creator.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{earning.creator.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {earning.period}
                      </TableCell>
                      <TableCell>
                        {earning.link ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm">
                              {earning.link.product?.title ?? 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              /{earning.link.shortCode}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">--</span>
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
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {earning.description ?? '--'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(earning.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && (
            <TablePagination
              pagination={pagination}
              label="earnings"
              onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setPage((p) => p + 1)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
