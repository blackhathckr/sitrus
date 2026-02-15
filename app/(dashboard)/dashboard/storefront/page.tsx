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
import { Copy, Plus, Globe, Lock, ExternalLink, Loader2 } from 'lucide-react';
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
    twitterUrl: string | null;
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

/** Payload for the create-collection form */
interface NewCollectionForm {
  name: string;
  slug: string;
  isPublic: boolean;
}

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
  }, [newCollection, fetchCollections]);

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
                  href={`https://${STOREFRONT_BASE_URL}/${cp?.slug ?? ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              {cp?.isApproved ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  Approved
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  Pending Approval
                </Badge>
              )}
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

            {/* Pending approval banner */}
            {cp && !cp.isApproved && (
              <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                Your storefront is pending approval by admin. It will not be
                publicly visible until approved.
              </div>
            )}
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
              Organize your products into themed collections
            </p>
          </div>

          {/* Create collection dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
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
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {collection._count.products}{' '}
                      {collection._count.products === 1
                        ? 'product'
                        : 'products'}
                    </span>
                    <span className="text-xs">Order: {collection.order}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
