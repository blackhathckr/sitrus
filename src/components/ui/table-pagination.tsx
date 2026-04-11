/**
 * Reusable Table Pagination Component
 *
 * Server-side pagination control used across all admin and dashboard
 * list pages. Shows "Page X of Y (N items)" with Previous/Next buttons.
 *
 * @module components/ui/table-pagination
 */

'use client';

import { Button } from '@/components/ui/button';

/** Standard page size used across all paginated list pages. */
export const PAGE_SIZE = 15;

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface TablePaginationProps {
  pagination: PaginationData;
  /** Label for the item count, e.g. "products", "brands", "orders" */
  label: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function TablePagination({
  pagination,
  label,
  onPreviousPage,
  onNextPage,
}: TablePaginationProps) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} {label})
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={pagination.page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!pagination.hasMore}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
