/**
 * Storefront Management Page
 *
 * Allows creators to manage their public storefront settings and
 * product collections. Displays the storefront URL, profile preview,
 * approval status, and a grid of collection cards with the ability
 * to create new collections.
 *
 * @module dashboard/storefront
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Copy, Plus, Globe, Lock, ExternalLink, Loader2, Trash2, Package, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape returned by GET /api/creators/me */
interface CreatorProfile {
  id: string;
  email: string;
  name: string;
  image: string | null;
  creatorProfile: {
    id: string;
    slug: string;
    displayName: string | null;
    bio: string | null;
    instagramHandle: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    tagline: string | null;
    youtubeUrl: string | null;
    isApproved: boolean;
    isPublic: boolean;
  };
  _count: { links: number; collections: number; earnings: number };
}

/** Shape returned by GET /api/collections */
interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  order: number;
  createdAt: string;
  _count: { products: number };
}

/** Product shape from /api/products */
interface Product {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
  marketplace: string;
}

/** Product inside a collection from /api/collections/[id] */
interface CollectionProduct {
  id: string;
  productId: string;
  product: Product;
}

/** Payload for the create-collection form */
interface NewCollectionForm {
  name: string;
  slug: string;
  isPublic: boolean;
}

const MAX_COLLECTIONS = 10;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STOREFRONT_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives a URL-friendly slug from a human-readable name.
 *
 * Converts to lowercase, replaces spaces / non-alphanumeric runs with
 * hyphens, and trims leading / trailing hyphens.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StorefrontPage() {
  // ---- State ---------------------------------------------------------------
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCollection, setNewCollection] = useState<NewCollectionForm>({
    name: '',
    slug: '',
    isPublic: true,
  });

  // Manage products in a collection
  const [manageCollectionId, setManageCollectionId] = useState<string | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [collectionProducts, setCollectionProducts] = useState<CollectionProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ---- Data fetching -------------------------------------------------------

  /**
   * Fetches the authenticated creator's profile from the API.
   * Sets profile state on success; shows an error toast on failure.
   */
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/creators/me');
      if (!res.ok) throw new Error('Failed to fetch profile');
      const json = await res.json();
      setProfile(json.data);
    } catch (err) {
      console.error('[Storefront] fetchProfile error:', err);
      toast.error('Failed to load profile');
    }
  }, []);

  /**
   * Fetches the creator's collections from the API.
   * Sets collections state on success; shows an error toast on failure.
   */
  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/collections');
      if (!res.ok) throw new Error('Failed to fetch collections');
      const json = await res.json();
      setCollections(json.data);
    } catch (err) {
      console.error('[Storefront] fetchCollections error:', err);
      toast.error('Failed to load collections');
    }
  }, []);

  /** Load profile and collections in parallel on mount. */
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await Promise.all([fetchProfile(), fetchCollections()]);
      setIsLoading(false);
    }
    load();
  }, [fetchProfile, fetchCollections]);

  // ---- Handlers ------------------------------------------------------------

  /**
   * Copies the storefront URL to the clipboard and shows a success toast.
   */
  const handleCopyUrl = useCallback(() => {
    if (!profile?.creatorProfile?.slug) return;
    const url = `${STOREFRONT_BASE_URL}/${profile.creatorProfile.slug}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Storefront URL copied to clipboard'),
      () => toast.error('Failed to copy URL'),
    );
  }, [profile]);

  /**
   * Updates the collection name field and auto-generates a slug.
   */
  const handleNameChange = useCallback((value: string) => {
    setNewCollection((prev) => ({
      ...prev,
      name: value,
      slug: slugify(value),
    }));
  }, []);

  /**
   * Submits the create-collection form via POST /api/collections.
   * Refreshes the collection list and resets the dialog on success.
   */
  const handleCreateCollection = useCallback(async () => {
    if (collections.length >= MAX_COLLECTIONS) {
      toast.error(`You can have a maximum of ${MAX_COLLECTIONS} collections`);
      return;
    }
    if (!newCollection.name.trim()) {
      toast.error('Collection name is required');
      return;
    }
    if (!newCollection.slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollection.name.trim(),
          slug: newCollection.slug.trim(),
          isPublic: newCollection.isPublic,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to create collection');
      }

      toast.success('Collection created');
      setDialogOpen(false);
      setNewCollection({ name: '', slug: '', isPublic: true });
      await fetchCollections();
    } catch (err) {
      console.error('[Storefront] handleCreateCollection error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to create collection',
      );
    } finally {
      setIsCreating(false);
    }
  }, [newCollection, collections.length, fetchCollections]);

  /**
   * Deletes a collection after confirmation.
   */
  const handleDeleteCollection = useCallback(async (collectionId: string) => {
    if (!confirm('Delete this collection? Products will be unlinked but not deleted.')) return;

    setIsDeleting(collectionId);
    try {
      const res = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Collection deleted');
      await fetchCollections();
    } catch {
      toast.error('Failed to delete collection');
    } finally {
      setIsDeleting(null);
    }
  }, [fetchCollections]);

  /**
   * Opens the manage-products dialog for a collection.
   * Fetches collection products and all available products.
   */
  const fetchProducts = useCallback(async (search: string, page: number, append: boolean) => {
    if (page === 1 && !append) setIsSearching(true);
    else setIsLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: '20', page: String(page) });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const json = await res.json();
        const products = json.data ?? [];
        setAvailableProducts((prev) => append ? [...prev, ...products] : products);
        setHasMoreProducts(json.pagination?.hasMore ?? false);
        setProductPage(page);
      }
    } catch {
      toast.error('Failed to load products');
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, []);

  const handleManageProducts = useCallback(async (collectionId: string) => {
    setManageCollectionId(collectionId);
    setManageDialogOpen(true);
    setIsLoadingProducts(true);
    setProductSearch('');
    setAvailableProducts([]);
    setProductPage(1);
    setHasMoreProducts(false);

    try {
      const colRes = await fetch(`/api/collections/${collectionId}`);
      if (colRes.ok) {
        const colJson = await colRes.json();
        setCollectionProducts(colJson.data?.products ?? []);
      }
      // Load first page of all products
      await fetchProducts('', 1, false);
    } catch {
      toast.error('Failed to load collection');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [fetchProducts]);

  // Debounced search — fires 500ms after user stops typing
  useEffect(() => {
    if (!manageDialogOpen) return;
    const timer = setTimeout(() => {
      setProductPage(1);
      fetchProducts(productSearch, 1, false);
    }, 500);
    return () => clearTimeout(timer);
  }, [productSearch, manageDialogOpen, fetchProducts]);

  /**
   * Adds a product to the currently managed collection.
   * Enforces: product can only be in 1 collection.
   */
  const handleAddProduct = useCallback(async (productId: string) => {
    if (!manageCollectionId) return;

    try {
      const res = await fetch(`/api/collections/${manageCollectionId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to add product');
      }

      toast.success('Product added to collection');
      // Refresh both lists
      await handleManageProducts(manageCollectionId);
      await fetchCollections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add product');
    }
  }, [manageCollectionId, handleManageProducts, fetchCollections]);

  /**
   * Removes a product from the currently managed collection.
   */
  const handleRemoveProduct = useCallback(async (productId: string) => {
    if (!manageCollectionId) return;

    try {
      const res = await fetch(`/api/collections/${manageCollectionId}/products`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) throw new Error('Failed to remove');

      toast.success('Product removed from collection');
      await handleManageProducts(manageCollectionId);
      await fetchCollections();
    } catch {
      toast.error('Failed to remove product');
    }
  }, [manageCollectionId, handleManageProducts, fetchCollections]);

  // ---- Loading state -------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <PageLottie name="storefront" description="Loading your storefront..." />
      </div>
    );
  }

  // ---- Render --------------------------------------------------------------

  const cp = profile?.creatorProfile;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Storefront</h1>
        <p className="text-muted-foreground">
          Manage your public storefront and product collections
        </p>
      </div>

      {/* ================================================================== */}
      {/* Section 1 : Storefront Settings                                    */}
      {/* ================================================================== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Storefront URL + status */}
        <Card>
          <CardHeader>
            <CardTitle>Storefront URL</CardTitle>
            <CardDescription>
              Share this link with your audience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium select-all">
                {STOREFRONT_BASE_URL}/{cp?.slug ?? '...'}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                aria-label="Copy storefront URL"
              >
                <Copy className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                asChild
                aria-label="Open storefront in new tab"
              >
                <a
                  href={`${STOREFRONT_BASE_URL}/${cp?.slug ?? ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              {cp?.isPublic ? (
                <Badge variant="outline" className="gap-1">
                  <Globe className="size-3" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Lock className="size-3" />
                  Private
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile preview card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Preview</CardTitle>
                <CardDescription>
                  How your storefront appears to visitors
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/profile">Edit Profile</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="size-16 shrink-0 overflow-hidden rounded-full border bg-muted">
                {cp?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cp.avatarUrl}
                    alt={cp.displayName ?? profile?.name ?? 'Avatar'}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xl font-bold text-muted-foreground">
                    {(cp?.displayName ?? profile?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-lg font-semibold">
                  {cp?.displayName ?? profile?.name ?? 'Unnamed Creator'}
                </p>
                {cp?.tagline && (
                  <p className="truncate text-sm text-muted-foreground">
                    {cp.tagline}
                  </p>
                )}
                {cp?.bio && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {cp.bio}
                  </p>
                )}
                {cp?.instagramHandle && (
                  <p className="text-sm text-muted-foreground">
                    @{cp.instagramHandle}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Section 2 : Collections                                            */}
      {/* ================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Collections
            </h2>
            <p className="text-sm text-muted-foreground">
              Organize your products into themed collections ({collections.length}/{MAX_COLLECTIONS})
            </p>
          </div>

          {/* Create collection dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={collections.length >= MAX_COLLECTIONS}
              >
                <Plus className="size-4" />
                Create Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collection</DialogTitle>
                <DialogDescription>
                  Add a new collection to organize your products on your
                  storefront.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="collection-name">Name</Label>
                  <Input
                    id="collection-name"
                    placeholder="e.g. Summer Essentials"
                    value={newCollection.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>

                {/* Slug (auto-generated) */}
                <div className="space-y-2">
                  <Label htmlFor="collection-slug">Slug</Label>
                  <Input
                    id="collection-slug"
                    placeholder="summer-essentials"
                    value={newCollection.slug}
                    onChange={(e) =>
                      setNewCollection((prev) => ({
                        ...prev,
                        slug: slugify(e.target.value),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated from the name. You can customise it.
                  </p>
                </div>

                {/* Visibility toggle */}
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="collection-public">Public</Label>
                    <p className="text-xs text-muted-foreground">
                      Make this collection visible on your storefront
                    </p>
                  </div>
                  <Switch
                    id="collection-public"
                    checked={newCollection.isPublic}
                    onCheckedChange={(checked) =>
                      setNewCollection((prev) => ({
                        ...prev,
                        isPublic: checked,
                      }))
                    }
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
                <Button
                  onClick={handleCreateCollection}
                  disabled={isCreating}
                  className="gap-1.5"
                >
                  {isCreating && <Loader2 className="size-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Collections grid or empty state */}
        {collections.length === 0 ? (
          <PageLottie
            name="collections"
            description="Create collections to organize your products"
            action={
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="size-4" />
                Create Collection
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collections.map((collection) => (
              <Card key={collection.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate text-base">
                      {collection.name}
                    </CardTitle>
                    {collection.isPublic ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 text-xs"
                      >
                        <Globe className="size-3" />
                        Public
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 text-xs"
                      >
                        <Lock className="size-3" />
                        Private
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    /{collection.slug}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {collection._count.products}{' '}
                      {collection._count.products === 1
                        ? 'product'
                        : 'products'}
                    </span>
                    <span className="text-xs">Order: {collection.order}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleManageProducts(collection.id)}
                    >
                      <Package className="size-3.5" />
                      Manage Products
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteCollection(collection.id)}
                      disabled={isDeleting === collection.id}
                    >
                      {isDeleting === collection.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Manage Products Dialog                                             */}
      {/* ================================================================== */}
      <Dialog open={manageDialogOpen} onOpenChange={(open) => {
        setManageDialogOpen(open);
        if (!open) setManageCollectionId(null);
      }}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Products</DialogTitle>
            <DialogDescription>
              Add or remove products from this collection. Each product can only belong to one collection.
            </DialogDescription>
          </DialogHeader>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Products in this collection */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  In Collection ({collectionProducts.length})
                </h3>
                {collectionProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No products in this collection yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {collectionProducts.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center gap-3 rounded-md border p-2"
                      >
                        {cp.product.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cp.product.imageUrl}
                            alt={cp.product.title}
                            className="size-10 shrink-0 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {cp.product.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cp.product.marketplace} · ₹{cp.product.price}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveProduct(cp.productId)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available products to add */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Available Products</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (() => {
                  const productsInCollection = new Set(
                    collectionProducts.map((cp) => cp.productId)
                  );
                  const available = availableProducts.filter(
                    (p) => !productsInCollection.has(p.id)
                  );
                  if (available.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-2">
                        {productSearch ? 'No products found.' : 'No more products available to add.'}
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {available.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 rounded-md border p-2"
                        >
                          {product.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="size-10 shrink-0 rounded object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {product.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.marketplace} · ₹{product.price}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1"
                            onClick={() => handleAddProduct(product.id)}
                          >
                            <Plus className="size-3.5" />
                            Add
                          </Button>
                        </div>
                      ))}
                      {hasMoreProducts && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => fetchProducts(productSearch, productPage + 1, true)}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? (
                            <Loader2 className="size-4 animate-spin mr-1.5" />
                          ) : null}
                          Load More
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
