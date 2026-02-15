/**
 * Creator Management Page
 *
 * Admin page for managing all creators on the Sitrus platform.
 * Displays a searchable, sortable table of creators with options
 * to view details and toggle approval status.
 *
 * Client component that fetches from GET /api/creators and
 * updates via PUT /api/creators/[id].
 *
 * @module app/(admin)/admin/creators/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Check, X, Eye, Loader2 } from 'lucide-react';
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
import { PageLottie } from '@/components/ui/page-lottie';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// Types
// =============================================================================

/** Shape of a creator profile as returned by GET /api/creators (admin view). */
interface CreatorProfile {
  id: string;
  slug: string;
  instagramHandle: string | null;
  displayName: string | null;
  isApproved: boolean;
  isPublic: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    role: string;
    createdAt: string;
    image: string | null;
  };
}

/** API response shape from GET /api/creators. */
interface CreatorsResponse {
  data: CreatorProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * AdminCreatorsPage
 *
 * Renders the full creator management interface with:
 * - Search input for filtering by name, slug, or Instagram handle
 * - Table of all creators with key fields
 * - Approve/revoke and view detail actions per row
 * - Loading and empty states via PageLottie
 */
export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  /**
   * Fetches the list of creators from the API with optional search filter.
   * Called on mount and whenever the search query changes.
   */
  const fetchCreators = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        page: '1',
      });

      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await fetch(`/api/creators?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }

      const json: CreatorsResponse = await response.json();
      setCreators(json.data);
      setPagination(json.pagination);
    } catch (error) {
      console.error('[AdminCreators] Fetch error:', error);
      toast.error('Failed to load creators. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch creators on mount and when search changes (debounced)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchCreators();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchCreators]);

  /**
   * Toggles the approval status of a creator profile.
   *
   * @param userId - The user ID of the creator to update
   * @param currentApproved - The current approval state (will be toggled)
   */
  const handleToggleApproval = async (
    userId: string,
    currentApproved: boolean
  ) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/creators/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: !currentApproved }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 'Failed to update creator approval'
        );
      }

      // Update local state optimistically
      setCreators((prev) =>
        prev.map((creator) =>
          creator.user.id === userId
            ? { ...creator, isApproved: !currentApproved }
            : creator
        )
      );

      toast.success(
        !currentApproved
          ? 'Creator approved successfully'
          : 'Creator approval revoked'
      );
    } catch (error) {
      console.error('[AdminCreators] Toggle approval error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update creator. Please try again.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Creators</h1>
          <p className="text-muted-foreground">
            Manage all creators on the platform
          </p>
        </div>
        <PageLottie name="creators" description="Loading creators..." />
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
        <h1 className="text-2xl font-bold tracking-tight">Creators</h1>
        <p className="text-muted-foreground">
          Manage all creators on the platform
        </p>
      </div>

      {/* Search + Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Creator Management</CardTitle>
          <CardDescription>
            {pagination.total} creator{pagination.total !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="mb-6 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, slug, or Instagram..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Empty State */}
          {creators.length === 0 ? (
            <PageLottie
              name="creators"
              description={
                search.trim()
                  ? `No creators match "${search}"`
                  : 'No creators found'
              }
            />
          ) : (
            /* Creators Table */
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-[220px]">Creator</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creators.map((creator) => (
                    <TableRow
                      key={creator.id}
                      className="hover:bg-muted/50"
                    >
                      {/* Creator Name + Email */}
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">
                            {creator.displayName || creator.user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {creator.user.email}
                          </p>
                        </div>
                      </TableCell>

                      {/* Slug */}
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs">
                          {creator.slug}
                        </code>
                      </TableCell>

                      {/* Instagram */}
                      <TableCell>
                        {creator.instagramHandle ? (
                          <span className="text-sm text-muted-foreground">
                            @{creator.instagramHandle}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">
                            --
                          </span>
                        )}
                      </TableCell>

                      {/* Approval Status */}
                      <TableCell className="text-center">
                        {creator.isApproved ? (
                          <Badge variant="default" className="text-xs">
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </TableCell>

                      {/* Active Status */}
                      <TableCell className="text-center">
                        {creator.user.isActive ? (
                          <Badge
                            variant="outline"
                            className="border-green-500/30 text-green-600 text-xs"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-red-500/30 text-red-600 text-xs"
                          >
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(creator.user.createdAt),
                          { addSuffix: true }
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Detail */}
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="size-8"
                          >
                            <Link
                              href={`/admin/creators/${creator.user.id}`}
                            >
                              <Eye className="size-4" />
                              <span className="sr-only">View creator</span>
                            </Link>
                          </Button>

                          {/* Toggle Approve/Revoke */}
                          <Button
                            variant={
                              creator.isApproved ? 'outline' : 'default'
                            }
                            size="sm"
                            disabled={actionLoading === creator.user.id}
                            onClick={() =>
                              handleToggleApproval(
                                creator.user.id,
                                creator.isApproved
                              )
                            }
                          >
                            {actionLoading === creator.user.id ? (
                              <Loader2 className="mr-1 size-3.5 animate-spin" />
                            ) : creator.isApproved ? (
                              <X className="mr-1 size-3.5" />
                            ) : (
                              <Check className="mr-1 size-3.5" />
                            )}
                            {creator.isApproved ? 'Revoke' : 'Approve'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Summary */}
          {pagination.total > 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Showing {creators.length} of {pagination.total} creator
              {pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
