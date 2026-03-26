/**
 * Admin Product Catalog Management Page
 *
 * Provides a data-dense table view of the entire product catalog
 * for platform administrators. Supports search, filtering by
 * marketplace and category, inline editing, creation, and
 * soft-deletion of products.
 *
 * @module app/(admin)/admin/products/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PageLottie } from '@/components/ui/page-lottie';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

/** Shape of a product returned by the API */
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
  commissionRate: number | null;
  isActive: boolean;
  createdAt: string;
  _count?: { links: number };
}

/** Pagination metadata from the API */
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/** Shape of the product form used for create and edit */
interface ProductForm {
  title: string;
  imageUrl: string;
  price: string;
  originalPrice: string;
  sourceUrl: string;
  marketplace: string;
  category: string;
  brand: string;
  commissionRate: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Available product categories */
const CATEGORIES = [
  'FASHION',
  'BEAUTY',
  'ELECTRONICS',
  'HOME_LIVING',
  'HEALTH_FITNESS',
  'ACCESSORIES',
  'FOOD_BEVERAGES',
  'OTHERS',
] as const;

/** Available marketplace options */
const MARKETPLACES = ['MYNTRA', 'FLIPKART', 'AJIO', 'AMAZON'] as const;

/** Number of products per page */
const PAGE_SIZE = 15;

/** Default empty form values */
const EMPTY_FORM: ProductForm = {
  title: '',
  imageUrl: '',
  price: '',
  originalPrice: '',
  sourceUrl: '',
  marketplace: '',
  category: '',
  brand: '',
  commissionRate: '',
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Returns a human-readable label for a category value.
 */
function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns Tailwind classes for marketplace badge coloring.
 */
function getMarketplaceClass(marketplace: string): string {
  const classes: Record<string, string> = {
    MYNTRA: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    FLIPKART: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    AJIO: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    AMAZON: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };
  return classes[marketplace] || '';
}

/**
 * Formats a price in INR.
 */
function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Admin Product Catalog Management Page
 *
 * Client component that provides full CRUD operations for the product
 * catalog. Products are displayed in a dense table format suitable for
 * administrative use, with search/filter controls and pagination.
 */
export default function AdminProductsPage() {
  // ---- State ---------------------------------------------------------------

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Brands master data
  const [brandOptions, setBrandOptions] = useState<{ id: string; name: string }[]>([]);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---- Data Fetching -------------------------------------------------------

  /**
   * Fetches products from the API with current search, filter, and
   * pagination parameters.
   */
  const fetchProducts = useCallback(
    async (currentPage: number) => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
        });

        if (search.trim()) {
          params.set('search', search.trim());
        }
        if (marketplaceFilter && marketplaceFilter !== 'all') {
          params.set('marketplace', marketplaceFilter);
        }
        if (categoryFilter && categoryFilter !== 'all') {
          params.set('category', categoryFilter);
        }

        const res = await fetch(`/api/products?${params.toString()}`);

        if (!res.ok) {
          throw new Error('Failed to fetch products');
        }

        const json = await res.json();
        setProducts(json.data);
        setPagination(json.pagination);
      } catch (err) {
        console.error('[AdminProducts] fetchProducts error:', err);
        toast.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    },
    [search, marketplaceFilter, categoryFilter]
  );

  /** Re-fetch whenever page, search, or filter changes. */
  useEffect(() => {
    fetchProducts(page);
  }, [page, fetchProducts]);

  /** Fetch brands for the dropdown. */
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch('/api/brands');
        if (res.ok) {
          const json = await res.json();
          setBrandOptions(
            (json.data ?? []).map((b: { id: string; name: string }) => ({
              id: b.id,
              name: b.name,
            }))
          );
        }
      } catch {
        // Brands loading is non-critical
      }
    }
    loadBrands();
  }, []);

  /** Reset to page 1 when filters change. */
  useEffect(() => {
    setPage(1);
  }, [search, marketplaceFilter, categoryFilter]);

  // ---- Form Handlers -------------------------------------------------------

  /**
   * Updates a single field in the product form state.
   */
  const updateForm = (field: keyof ProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Opens the create dialog with an empty form.
   */
  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setCreateDialogOpen(true);
  };

  /**
   * Opens the edit dialog pre-populated with the selected product's data.
   */
  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setForm({
      title: product.title,
      imageUrl: product.imageUrl,
      price: String(product.price),
      originalPrice: product.originalPrice ? String(product.originalPrice) : '',
      sourceUrl: product.sourceUrl,
      marketplace: product.marketplace,
      category: product.category,
      brand: product.brand || '',
      commissionRate: product.commissionRate ? String(product.commissionRate) : '',
    });
    setEditDialogOpen(true);
  };

  /**
   * Opens the delete confirmation dialog for the selected product.
   */
  const handleOpenDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  /**
   * Creates a new product via POST /api/products.
   */
  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Product title is required');
      return;
    }
    if (!form.imageUrl.trim()) {
      toast.error('Image URL is required');
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      toast.error('Valid price is required');
      return;
    }
    if (!form.sourceUrl.trim()) {
      toast.error('Source URL is required');
      return;
    }
    if (!form.marketplace) {
      toast.error('Marketplace is required');
      return;
    }
    if (!form.category) {
      toast.error('Category is required');
      return;
    }

    setIsSaving(true);

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        imageUrl: form.imageUrl.trim(),
        price: Number(form.price),
        sourceUrl: form.sourceUrl.trim(),
        marketplace: form.marketplace,
        category: form.category,
      };

      if (form.originalPrice && !isNaN(Number(form.originalPrice))) {
        body.originalPrice = Number(form.originalPrice);
      }
      if (form.brand.trim()) {
        body.brand = form.brand.trim();
      }
      if (form.commissionRate && !isNaN(Number(form.commissionRate))) {
        body.commissionRate = Number(form.commissionRate);
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to create product');
      }

      toast.success('Product created successfully');
      setCreateDialogOpen(false);
      setForm(EMPTY_FORM);
      await fetchProducts(page);
    } catch (err) {
      console.error('[AdminProducts] handleCreate error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Updates an existing product via PUT /api/products/{id}.
   */
  const handleEdit = async () => {
    if (!selectedProduct) return;

    if (!form.title.trim()) {
      toast.error('Product title is required');
      return;
    }

    setIsSaving(true);

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        imageUrl: form.imageUrl.trim(),
        price: Number(form.price),
        sourceUrl: form.sourceUrl.trim(),
        marketplace: form.marketplace,
        category: form.category,
      };

      if (form.originalPrice && !isNaN(Number(form.originalPrice))) {
        body.originalPrice = Number(form.originalPrice);
      }
      if (form.brand.trim()) {
        body.brand = form.brand.trim();
      }
      if (form.commissionRate && !isNaN(Number(form.commissionRate))) {
        body.commissionRate = Number(form.commissionRate);
      }

      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to update product');
      }

      toast.success('Product updated successfully');
      setEditDialogOpen(false);
      setSelectedProduct(null);
      setForm(EMPTY_FORM);
      await fetchProducts(page);
    } catch (err) {
      console.error('[AdminProducts] handleEdit error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Soft-deletes a product via DELETE /api/products/{id}.
   */
  const handleDelete = async () => {
    if (!selectedProduct) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to delete product');
      }

      toast.success('Product deactivated successfully');
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      await fetchProducts(page);
    } catch (err) {
      console.error('[AdminProducts] handleDelete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Pagination Handlers -------------------------------------------------

  /** Navigate to the previous page */
  const handlePreviousPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  /** Navigate to the next page */
  const handleNextPage = () => {
    if (pagination?.hasMore) setPage((prev) => prev + 1);
  };

  // ---- Render: Loading State -----------------------------------------------

  if (isLoading && products.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <PageLottie
          name="products"
          description="Loading product catalog..."
        />
      </div>
    );
  }

  // ---- Shared Product Form JSX ---------------------------------------------

  /**
   * Renders the product form fields used by both create and edit dialogs.
   */
  const renderFormFields = () => (
    <div className="grid gap-4 py-2">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="product-title">Title *</Label>
        <Input
          id="product-title"
          placeholder="e.g. Nike Air Max 90"
          value={form.title}
          onChange={(e) => updateForm('title', e.target.value)}
        />
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <Label htmlFor="product-image">Image URL *</Label>
        <Input
          id="product-image"
          placeholder="https://..."
          value={form.imageUrl}
          onChange={(e) => updateForm('imageUrl', e.target.value)}
        />
      </div>

      {/* Price & Original Price */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product-price">Price (INR) *</Label>
          <Input
            id="product-price"
            type="number"
            placeholder="999"
            value={form.price}
            onChange={(e) => updateForm('price', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-original-price">Original Price (INR)</Label>
          <Input
            id="product-original-price"
            type="number"
            placeholder="1499"
            value={form.originalPrice}
            onChange={(e) => updateForm('originalPrice', e.target.value)}
          />
        </div>
      </div>

      {/* Source URL */}
      <div className="space-y-2">
        <Label htmlFor="product-source">Source URL *</Label>
        <Input
          id="product-source"
          placeholder="https://www.myntra.com/..."
          value={form.sourceUrl}
          onChange={(e) => updateForm('sourceUrl', e.target.value)}
        />
      </div>

      {/* Marketplace & Category */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Marketplace *</Label>
          <Select
            value={form.marketplace}
            onValueChange={(value) => updateForm('marketplace', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select marketplace" />
            </SelectTrigger>
            <SelectContent>
              {MARKETPLACES.map((mp) => (
                <SelectItem key={mp} value={mp}>
                  {mp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={form.category}
            onValueChange={(value) => updateForm('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {formatCategory(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Brand & Commission Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product-brand">Brand</Label>
          <Select
            value={form.brand || 'none'}
            onValueChange={(val) => updateForm('brand', val === 'none' ? '' : val)}
          >
            <SelectTrigger id="product-brand">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No brand</SelectItem>
              {brandOptions.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-commission">Commission Rate (%)</Label>
          <Input
            id="product-commission"
            type="number"
            placeholder="5"
            value={form.commissionRate}
            onChange={(e) => updateForm('commissionRate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  // ---- Render: Main View ---------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Catalog</h1>
          <p className="text-muted-foreground">
            Manage products available for creators
            {pagination && (
              <span className="ml-1">({pagination.total} total)</span>
            )}
          </p>
        </div>

        {/* Add Product Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" onClick={handleOpenCreate}>
              <Plus className="size-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a product to the catalog for creators to promote.
              </DialogDescription>
            </DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                Create Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products by title..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Marketplace Filter */}
            <Select
              value={marketplaceFilter}
              onValueChange={setMarketplaceFilter}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Marketplaces</SelectItem>
                {MARKETPLACES.map((mp) => (
                  <SelectItem key={mp} value={mp}>
                    {mp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {formatCategory(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Products
          </CardTitle>
          <CardDescription>
            All products in the catalog. Click actions to edit or remove.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <PageLottie
                name="products"
                description="No products found. Try adjusting your filters or add a new product."
                action={
                  <Button
                    className="mt-2 gap-1.5"
                    onClick={handleOpenCreate}
                  >
                    <Plus className="size-4" />
                    Add Product
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-[60px]">Image</TableHead>
                      <TableHead className="min-w-[200px]">Title</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id} className="hover:bg-muted/50">
                        {/* Image */}
                        <TableCell>
                          <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                            <Image
                              src={product.imageUrl}
                              alt={product.title}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        </TableCell>

                        {/* Title */}
                        <TableCell>
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate text-sm font-medium">
                              {product.title}
                            </p>
                            {product._count && (
                              <p className="text-xs text-muted-foreground">
                                {product._count.links} link{product._count.links !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Brand */}
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {product.brand || '-'}
                          </span>
                        </TableCell>

                        {/* Price */}
                        <TableCell className="text-right">
                          <div>
                            <p className="text-sm font-medium tabular-nums">
                              {formatPrice(product.price)}
                            </p>
                            {product.originalPrice &&
                              product.originalPrice > product.price && (
                                <p className="text-xs text-muted-foreground line-through tabular-nums">
                                  {formatPrice(product.originalPrice)}
                                </p>
                              )}
                          </div>
                        </TableCell>

                        {/* Marketplace */}
                        <TableCell>
                          <Badge
                            className={`text-xs ${getMarketplaceClass(product.marketplace)}`}
                          >
                            {product.marketplace}
                          </Badge>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {formatCategory(product.category)}
                          </span>
                        </TableCell>

                        {/* Commission */}
                        <TableCell className="text-right">
                          <span className="text-sm tabular-nums">
                            {product.commissionRate
                              ? `${product.commissionRate}%`
                              : '-'}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {product.isActive ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(product)}
                              title="Edit product"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(product)}
                              title="Delete product"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}{' '}
                    ({pagination.total} products)
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
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* EDIT PRODUCT DIALOG                                                */}
      {/* ================================================================== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details. Changes will be reflected immediately.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedProduct(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSaving}
              className="gap-1.5"
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* DELETE CONFIRMATION DIALOG                                         */}
      {/* ================================================================== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-foreground">
                {selectedProduct?.title}
              </span>
              ? This will hide it from the catalog and creator storefronts.
              This action can be reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedProduct(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
