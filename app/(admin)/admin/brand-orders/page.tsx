/**
 * Admin Brand Orders Page
 *
 * View and filter orders tracked from external brands via EasyEcom.
 * Shows order details, attribution to creators, and status.
 *
 * @module app/(admin)/admin/brand-orders/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search,
  ShoppingCart,
  User,
  ExternalLink,
  IndianRupee,
  Package,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// =============================================================================
// TYPES
// =============================================================================

interface BrandOrder {
  id: string;
  orderNumber: string;
  orderValue: number;
  currency: string;
  status: string;
  itemCount: number;
  customerName: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  orderedAt: string;
  brand: { id: string; name: string; logoUrl: string | null };
  creator: { id: string; name: string; email: string } | null;
  link: { id: string; shortCode: string } | null;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sku: string | null;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  dispatched: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function AdminBrandOrdersPage() {
  const [orders, setOrders] = useState<BrandOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('_all');
  const [page, setPage] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter && statusFilter !== '_all') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/admin/brand-orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setOrders(json.data);
      setPagination(json.pagination);
    } catch (err) {
      console.error('[BrandOrders] fetch error:', err);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ---- Computed stats -------------------------------------------------------

  const totalGMV = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.orderValue : 0), 0);
  const attributedCount = orders.filter((o) => o.creator !== null).length;

  // ---- Loading state -------------------------------------------------------

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <PageLottie name="analytics" description="Loading brand orders..." />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand Orders</h1>
        <p className="text-muted-foreground">
          Orders tracked from integrated brands via EasyEcom
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <IndianRupee className="size-5 text-green-700 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total GMV</p>
                <p className="text-2xl font-bold">{formatPrice(totalGMV)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ShoppingCart className="size-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{pagination?.total || orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <User className="size-5 text-purple-700 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attributed to Creators</p>
                <p className="text-2xl font-bold">{attributedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Statuses</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <PageLottie
          name="analytics"
          description={
            statusFilter !== '_all'
              ? 'No orders match this filter'
              : 'No brand orders yet. Sync orders from the Integrations page.'
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>{pagination?.total || orders.length} orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedOrder(expandedOrder === order.id ? null : order.id)
                    }
                  >
                    <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.brand.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={order.brand.logoUrl}
                            alt={order.brand.name}
                            className="size-6 shrink-0 rounded object-contain"
                          />
                        ) : null}
                        <span className="text-sm">{order.brand.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.creator ? (
                        <div>
                          <span className="text-sm font-medium">{order.creator.name}</span>
                          {order.link && (
                            <p className="text-xs text-muted-foreground font-mono">
                              /{order.link.shortCode}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unattributed</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(order.orderValue)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.itemCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[order.status] || ''}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.orderedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && (
              <TablePagination
                pagination={pagination}
                label="orders"
                onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
                onNextPage={() => setPage((p) => p + 1)}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
