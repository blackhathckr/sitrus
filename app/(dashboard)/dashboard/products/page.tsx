/**
 * Products Browse Page
 *
 * Allows creators to browse the marketplace product catalog, filter by
 * category / marketplace / keyword, and create SitLinks directly from
 * any product card. On successful link creation the short URL is
 * automatically copied to the clipboard.
 *
 * @module app/(dashboard)/dashboard/products/page
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Search, Plus, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLottie } from '@/components/ui/page-lottie';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a single product returned by GET /api/products */
interface Product {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  sourceUrl: string;
  marketplace: string;
  category: string;
  brand: string | null;
  rating: number | null;
  commissionRate: number;
  isActive: boolean;
}

/** Pagination metadata from the API */
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/** Full response shape from GET /api/products */
interface ProductsResponse {
  data: Product[];
  pagination: Pagination;
}

/** Response from POST /api/links */
interface CreateLinkResponse {
  message: string;
  link: {
    id: string;
    shortCode: string;
    customAlias: string | null;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base domain used when copying the new short URL */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SHORT_URL_DOMAIN = `${APP_URL}/api/r`;

/** Number of products per page */
const PAGE_SIZE = 12;

/** Debounce delay in milliseconds for the search input */
const SEARCH_DEBOUNCE_MS = 300;

/** Human-readable category labels keyed by API enum value */
const CATEGORIES: { value: string; label: string }[] = [
  { value: 'FASHION', label: 'Fashion' },
  { value: 'BEAUTY', label: 'Beauty' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'HOME_LIVING', label: 'Home & Living' },
  { value: 'HEALTH_FITNESS', label: 'Health & Fitness' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'FOOD_BEVERAGES', label: 'Food & Beverages' },
  { value: 'OTHERS', label: 'Others' },
];

/** Human-readable marketplace labels keyed by API enum value */
const MARKETPLACES: { value: string; label: string }[] = [
  { value: 'MYNTRA', label: 'Myntra' },
  { value: 'FLIPKART', label: 'Flipkart' },
  { value: 'AJIO', label: 'Ajio' },
  { value: 'AMAZON', label: 'Amazon' },
];

/**
 * Map marketplace enum values to colour classes for badges.
 * Keeps the UI visually distinct per marketplace.
 */
const MARKETPLACE_COLORS: Record<string, string> = {
  MYNTRA: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  FLIPKART:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AJIO: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  AMAZON:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

// ---------------------------------------------------------------------------
// Skeleton Card
// ---------------------------------------------------------------------------

/** A placeholder card rendered during the loading state */
function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <CardContent className="flex flex-col gap-2 pt-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ProductsPage — the creator's product browsing view.
 *
 * Supports keyword search (debounced), category/marketplace filtering,
 * and pagination. Each product card has a "Create SitLink" button that
 * calls POST /api/links and copies the new short URL to the clipboard.
 */
export default function ProductsPage() {
  // ---- State ----------------------------------------------------------------
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [marketplace, setMarketplace] = useState<string>('');

  // Tracks which product is currently having a link created (by product id)
  const [creatingLinkFor, setCreatingLinkFor] = useState<string | null>(null);

  // Ref for the debounce timer so we can clear it on unmount
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Debounced Search Input -----------------------------------------------

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // reset to first page on new search
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // ---- Data Fetching --------------------------------------------------------

  /**
   * Fetch products from the API with the current filters and page.
   */
  const fetchProducts = useCallback(
    async (
      currentPage: number,
      search: string,
      cat: string,
      mp: string,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
        });

        if (search) params.set('search', search);
        if (cat) params.set('category', cat);
        if (mp) params.set('marketplace', mp);

        const res = await fetch(`/api/products?${params.toString()}`);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Failed to fetch products (${res.status})`,
          );
        }

        const json: ProductsResponse = await res.json();
        setProducts(json.data);
        setPagination(json.pagination);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /** Re-fetch whenever page, debounced search, category, or marketplace changes */
  useEffect(() => {
    fetchProducts(page, debouncedSearch, category, marketplace);
  }, [page, debouncedSearch, category, marketplace, fetchProducts]);

  // ---- Handlers -------------------------------------------------------------

  /**
   * Create a SitLink for the given product.
   *
   * On success the new short URL is copied to the clipboard and a
   * success toast is shown. If the request fails an error toast is
   * displayed instead.
   *
   * @param productId - The ID of the product to create a link for
   */
  const handleCreateLink = async (productId: string) => {
    setCreatingLinkFor(productId);

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to create link (${res.status})`);
      }

      const json: CreateLinkResponse = await res.json();
      const shortUrl = `${SHORT_URL_DOMAIN}/${json.link.customAlias || json.link.shortCode}`;

      // Copy the new short URL to the clipboard
      try {
        await navigator.clipboard.writeText(shortUrl);
      } catch {
        // Clipboard write may fail in insecure contexts — non-blocking
      }

      toast.success('SitLink created! Short URL copied.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create link';
      toast.error(message);
    } finally {
      setCreatingLinkFor(null);
    }
  };

  /**
   * Handle category filter change.
   * The special value "_all" clears the filter.
   */
  const handleCategoryChange = (value: string) => {
    setCategory(value === '_all' ? '' : value);
    setPage(1);
  };

  /**
   * Handle marketplace filter change.
   * The special value "_all" clears the filter.
   */
  const handleMarketplaceChange = (value: string) => {
    setMarketplace(value === '_all' ? '' : value);
    setPage(1);
  };

  /** Navigate to the previous page */
  const handlePreviousPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  /** Navigate to the next page */
  const handleNextPage = () => {
    if (pagination?.hasMore) setPage((prev) => prev + 1);
  };

  // ---- Render: Helpers ------------------------------------------------------

  /**
   * Return a human-readable label for a marketplace enum value.
   */
  const getMarketplaceLabel = (mp: string): string => {
    return MARKETPLACES.find((m) => m.value === mp)?.label || mp;
  };

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse Products</h1>
        <p className="text-muted-foreground">
          Find products and create SitLinks to start earning
        </p>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={category || '_all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Marketplace Filter */}
        <Select
          value={marketplace || '_all'}
          onValueChange={handleMarketplaceChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Marketplace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Marketplaces</SelectItem>
            {MARKETPLACES.map((mp) => (
              <SelectItem key={mp.value} value={mp.value}>
                {mp.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading State: Skeleton Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            onClick={() =>
              fetchProducts(page, debouncedSearch, category, marketplace)
            }
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && products.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <PageLottie
            name="products"
            description="No products found"
            action={
              (debouncedSearch || category || marketplace) ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setCategory('');
                    setMarketplace('');
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Product Grid */}
      {!isLoading && !error && products.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="group flex flex-col overflow-hidden"
              >
                {/* Product Image */}
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <CardContent className="flex flex-1 flex-col gap-1.5 pt-4">
                  {/* Brand */}
                  {product.brand && (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {product.brand}
                    </p>
                  )}

                  {/* Title (max 2 lines) */}
                  <p className="line-clamp-2 text-sm font-medium leading-snug">
                    {product.title}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-base font-bold">
                      &#8377;{product.price.toLocaleString('en-IN')}
                    </span>
                    {product.originalPrice &&
                      product.originalPrice !== product.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          &#8377;
                          {product.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    {product.originalPrice &&
                      product.originalPrice > product.price && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          {Math.round(
                            ((product.originalPrice - product.price) /
                              product.originalPrice) *
                              100,
                          )}
                          % off
                        </span>
                      )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                    <Badge
                      variant="secondary"
                      className={
                        MARKETPLACE_COLORS[product.marketplace] || ''
                      }
                    >
                      <ShoppingBag className="size-3" />
                      {getMarketplaceLabel(product.marketplace)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {product.commissionRate}% commission
                    </Badge>
                  </div>

                  {/* Rating (optional) */}
                  {product.rating !== null && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      Rating: {product.rating.toFixed(1)} / 5
                    </p>
                  )}
                </CardContent>

                {/* Create SitLink Button */}
                <CardFooter>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleCreateLink(product.id)}
                    disabled={creatingLinkFor === product.id}
                  >
                    {creatingLinkFor === product.id ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        Create SitLink
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
                <span className="ml-1">
                  ({pagination.total} product{pagination.total !== 1 ? 's' : ''})
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
