/**
 * SitLinks Management Page
 *
 * Displays the creator's affiliate links in a paginated table.
 * Each row shows the linked product, short URL with one-click copy,
 * click analytics, active/inactive status, and creation date.
 *
 * Creators navigate to /dashboard/products to browse the catalog
 * and generate new SitLinks from there.
 *
 * @module app/(dashboard)/dashboard/links/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, Plus, ExternalLink, LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
import { PageLottie } from '@/components/ui/page-lottie';
import { TablePagination, PAGE_SIZE } from '@/components/ui/table-pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a single SitLink returned by GET /api/links */
interface SitLink {
  id: string;
  shortCode: string;
  customAlias: string | null;
  affiliateUrl: string;
  totalClicks: number;
  isActive: boolean;
  createdAt: string;
  product: {
    id: string;
    title: string;
    imageUrl: string;
    price: number;
    marketplace: string;
    brand: string | null;
  };
}

/** Pagination metadata from the API */
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/** Full response shape from GET /api/links */
interface LinksResponse {
  data: SitLink[];
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base domain used in the short URL display */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SHORT_URL_DOMAIN = `${APP_URL}/api/r`;

/** Number of links displayed per page */

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * LinksPage — the creator's SitLinks management view.
 *
 * Fetches paginated links from the API, renders them in a table, and
 * provides copy-to-clipboard functionality for each short URL.
 */
export default function LinksPage() {
  // ---- State ----------------------------------------------------------------
  const [links, setLinks] = useState<SitLink[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Data Fetching --------------------------------------------------------

  /**
   * Fetch the creator's SitLinks for the given page.
   * Updates links, pagination, and error state accordingly.
   */
  const fetchLinks = useCallback(async (currentPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      });

      const res = await fetch(`/api/links?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch links (${res.status})`);
      }

      const json: LinksResponse = await res.json();
      setLinks(json.data);
      setPagination(json.pagination);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Re-fetch whenever the page number changes */
  useEffect(() => {
    fetchLinks(page);
  }, [page, fetchLinks]);

  // ---- Handlers -------------------------------------------------------------

  /**
   * Copy the full short URL to the user's clipboard and show a success toast.
   *
   * @param shortCode - The unique short code for the SitLink
   */
  const handleCopyUrl = async (shortCode: string) => {
    const url = `${SHORT_URL_DOMAIN}/${shortCode}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      // Fallback for older browsers / insecure contexts
      toast.error('Failed to copy link');
    }
  };

  /** Navigate to the previous page */
  const handlePreviousPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  /** Navigate to the next page */
  const handleNextPage = () => {
    if (pagination?.hasMore) setPage((prev) => prev + 1);
  };

  // ---- Render: Loading State ------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <PageLottie
          name="links"
          description="Loading your SitLinks..."
        />
      </div>
    );
  }

  // ---- Render: Error State --------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => fetchLinks(page)}>
          Try Again
        </Button>
      </div>
    );
  }

  // ---- Render: Empty State --------------------------------------------------

  if (links.length === 0 && page === 1) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My SitLinks</h1>
            <p className="text-muted-foreground">
              Manage your affiliate short links
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/products">
              <Plus />
              Create SitLink
            </Link>
          </Button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <PageLottie
            name="links"
            description="You haven't created any SitLinks yet"
            action={
              <Button asChild>
                <Link href="/dashboard/products">
                  <Plus />
                  Browse Products
                </Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // ---- Render: Links Table --------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My SitLinks</h1>
          <p className="text-muted-foreground">
            Manage your affiliate short links
            {pagination && (
              <span className="ml-1">
                ({pagination.total} total)
              </span>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products">
            <Plus />
            Create SitLink
          </Link>
        </Button>
      </div>

      {/* Links Card / Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="size-5" />
            Your Links
          </CardTitle>
          <CardDescription>
            Click the copy button to grab any short URL instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="w-[300px]">Product</TableHead>
                  <TableHead>Short URL</TableHead>
                  <TableHead className="text-center">Clicks</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id} className="hover:bg-muted/50">
                    {/* Product */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={link.product.imageUrl}
                          alt={link.product.title}
                          className="size-10 rounded-md border object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium max-w-[220px]">
                            {link.product.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {link.product.marketplace}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Short URL + Copy */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          {SHORT_URL_DOMAIN}/{link.customAlias || link.shortCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            handleCopyUrl(link.customAlias || link.shortCode)
                          }
                          title="Copy short URL"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <a
                          href={`${SHORT_URL_DOMAIN}/${link.customAlias || link.shortCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    </TableCell>

                    {/* Clicks */}
                    <TableCell className="text-center">
                      <span className="tabular-nums font-medium">
                        {link.totalClicks.toLocaleString()}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {link.isActive ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(link.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination && (
            <TablePagination
              pagination={pagination}
              label="links"
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
