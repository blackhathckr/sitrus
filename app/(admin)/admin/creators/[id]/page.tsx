/**
 * Admin Creator Detail Page
 *
 * Allows platform administrators to view and manage a specific
 * creator's profile, approval status, and account settings.
 * Shows user information, creator profile details, stats, and
 * recent links with the ability to toggle approval and active status.
 *
 * @module app/(admin)/admin/creators/[id]/page
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Check, X, ExternalLink } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { PageLottie } from '@/components/ui/page-lottie';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

/** Full creator detail shape returned by GET /api/creators/{id} */
interface CreatorDetail {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  isActive: boolean;
  phone: string | null;
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
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
  } | null;
  _count: { links: number; collections: number };
}

/** Editable fields for admin updates */
interface EditableFields {
  name: string;
  isActive: boolean;
  isApproved: boolean;
  displayName: string;
  bio: string;
  instagramHandle: string;
  slug: string;
  tagline: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generates initials from a name string for avatar fallback.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Formats a date string to a locale-aware display format.
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a date string to include both date and time.
 */
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Admin Creator Detail Page
 *
 * Client component that fetches a single creator's full profile
 * via the admin API and provides controls for administrators to
 * view details, toggle approval/active status, and save changes.
 */
export default function AdminCreatorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const creatorId = params.id;

  // ---- State ---------------------------------------------------------------

  const [creator, setCreator] = useState<CreatorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  /** Editable form fields, initialized from fetched data */
  const [fields, setFields] = useState<EditableFields>({
    name: '',
    isActive: true,
    isApproved: false,
    displayName: '',
    bio: '',
    instagramHandle: '',
    slug: '',
    tagline: '',
  });

  // ---- Data Fetching -------------------------------------------------------

  /**
   * Fetches the creator detail from GET /api/creators/{id}.
   */
  useEffect(() => {
    if (!creatorId) return;

    async function fetchCreator() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/creators/${creatorId}`);

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Creator not found');
          }
          throw new Error('Failed to fetch creator details');
        }

        const json = await res.json();
        const data: CreatorDetail = json.data;
        setCreator(data);

        // Initialize editable fields from fetched data
        setFields({
          name: data.name || '',
          isActive: data.isActive,
          isApproved: data.creatorProfile?.isApproved ?? false,
          displayName: data.creatorProfile?.displayName || '',
          bio: data.creatorProfile?.bio || '',
          instagramHandle: data.creatorProfile?.instagramHandle || '',
          slug: data.creatorProfile?.slug || '',
          tagline: data.creatorProfile?.tagline || '',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong';
        setError(message);
        console.error('[AdminCreatorDetail] fetchCreator error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCreator();
  }, [creatorId]);

  // ---- Handlers ------------------------------------------------------------

  /**
   * Updates a single editable field and marks the form as dirty.
   */
  const updateField = <K extends keyof EditableFields>(
    key: K,
    value: EditableFields[K],
  ) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  /**
   * Saves all editable changes via PUT /api/creators/{id}.
   * Sends only user-level and profile-level fields that the
   * admin update endpoint accepts.
   */
  const handleSave = async () => {
    if (!creator) return;

    setIsSaving(true);

    try {
      const body: Record<string, unknown> = {
        name: fields.name.trim(),
        isActive: fields.isActive,
        isApproved: fields.isApproved,
      };

      // Only include profile fields if the creator has a profile
      if (creator.creatorProfile) {
        if (fields.displayName.trim()) {
          body.displayName = fields.displayName.trim();
        }
        if (fields.bio.trim()) {
          body.bio = fields.bio.trim();
        }
        if (fields.instagramHandle.trim()) {
          body.instagramHandle = fields.instagramHandle.trim();
        }
        if (fields.slug.trim()) {
          body.slug = fields.slug.trim();
        }
        if (fields.tagline.trim()) {
          body.tagline = fields.tagline.trim();
        }
      }

      const res = await fetch(`/api/creators/${creatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to update creator');
      }

      const json = await res.json();
      const updated = json.data;

      // Update local state with the response
      setCreator((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: updated.name ?? prev.name,
          isActive: updated.isActive ?? prev.isActive,
          creatorProfile: updated.creatorProfile ?? prev.creatorProfile,
        };
      });

      setHasChanges(false);
      toast.success('Creator updated successfully');
    } catch (err) {
      console.error('[AdminCreatorDetail] handleSave error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update creator');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Render: Loading State -----------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <PageLottie
          name="creators"
          description="Loading creator details..."
        />
      </div>
    );
  }

  // ---- Render: Error State -------------------------------------------------

  if (error || !creator) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-destructive">{error || 'Creator not found'}</p>
        <Button variant="outline" onClick={() => router.push('/admin/creators')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Creators
        </Button>
      </div>
    );
  }

  const cp = creator.creatorProfile;

  // ---- Render: Main View ---------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/admin/creators')}
            title="Back to creators list"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {creator.name}
            </h1>
            <p className="text-muted-foreground">{creator.email}</p>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* ================================================================== */}
      {/* USER INFORMATION + STATUS TOGGLES                                  */}
      {/* ================================================================== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Account details and authentication information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Name (editable) */}
              <div className="space-y-2">
                <Label htmlFor="user-name">Full Name</Label>
                <Input
                  id="user-name"
                  value={fields.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={creator.email} disabled />
              </div>

              {/* Role (read-only) */}
              <div className="space-y-2">
                <Label>Role</Label>
                <div>
                  <Badge variant={creator.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {creator.role}
                  </Badge>
                </div>
              </div>

              {/* Phone (read-only) */}
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={creator.phone || 'Not provided'} disabled />
              </div>

              {/* Joined date (read-only) */}
              <div className="space-y-2">
                <Label>Joined</Label>
                <Input value={formatDate(creator.createdAt)} disabled />
              </div>

              {/* Last login (read-only) */}
              <div className="space-y-2">
                <Label>Last Login</Label>
                <Input
                  value={
                    creator.lastLogin
                      ? formatDateTime(creator.lastLogin)
                      : 'Never'
                  }
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status & Controls Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status Controls</CardTitle>
            <CardDescription>
              Toggle account and profile status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="toggle-active">Account Active</Label>
                <p className="text-xs text-muted-foreground">
                  Deactivating prevents login and hides the storefront
                </p>
              </div>
              <Switch
                id="toggle-active"
                checked={fields.isActive}
                onCheckedChange={(checked) => updateField('isActive', checked)}
              />
            </div>

            {/* Approved Toggle */}
            {cp && (
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="toggle-approved">Profile Approved</Label>
                  <p className="text-xs text-muted-foreground">
                    Approval makes the storefront publicly visible
                  </p>
                </div>
                <Switch
                  id="toggle-approved"
                  checked={fields.isApproved}
                  onCheckedChange={(checked) =>
                    updateField('isApproved', checked)
                  }
                />
              </div>
            )}

            <Separator />

            {/* Current Status Display */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Current Status
              </Label>
              <div className="flex flex-wrap gap-2">
                {fields.isActive ? (
                  <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Check className="size-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <X className="size-3" />
                    Inactive
                  </Badge>
                )}

                {cp && (
                  <>
                    {fields.isApproved ? (
                      <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="size-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Pending
                      </Badge>
                    )}

                    {cp.isPublic ? (
                      <Badge variant="outline" className="gap-1">
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        Private
                      </Badge>
                    )}
                  </>
                )}

                <Badge variant="outline">
                  {creator.emailVerified ? 'Email Verified' : 'Email Unverified'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* CREATOR PROFILE SECTION                                            */}
      {/* ================================================================== */}
      {cp ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Creator Profile</CardTitle>
                <CardDescription>
                  Storefront profile settings and social links
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/${cp.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 size-4" />
                  View Storefront
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Avatar & Banner Preview */}
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-muted">
                  {cp.avatarUrl ? (
                    <Image
                      src={cp.avatarUrl}
                      alt={cp.displayName || creator.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xl font-bold text-muted-foreground">
                      {getInitials(cp.displayName || creator.name)}
                    </div>
                  )}
                </div>

                {/* Banner Preview */}
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">
                    Banner Preview
                  </Label>
                  {cp.bannerUrl ? (
                    <div className="relative mt-1 h-24 overflow-hidden rounded-md border">
                      <Image
                        src={cp.bannerUrl}
                        alt="Banner"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 600px"
                      />
                    </div>
                  ) : (
                    <div className="mt-1 flex h-24 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                      No banner uploaded
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Editable Profile Fields */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="profile-slug">Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      sitrus.club/
                    </span>
                    <Input
                      id="profile-slug"
                      value={fields.slug}
                      onChange={(e) => updateField('slug', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="profile-display-name">Display Name</Label>
                  <Input
                    id="profile-display-name"
                    value={fields.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    placeholder="Public display name"
                  />
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <Label htmlFor="profile-tagline">Tagline</Label>
                  <Input
                    id="profile-tagline"
                    value={fields.tagline}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    placeholder="Short tagline"
                  />
                </div>

                {/* Instagram Handle */}
                <div className="space-y-2">
                  <Label htmlFor="profile-instagram">Instagram Handle</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">@</span>
                    <Input
                      id="profile-instagram"
                      value={fields.instagramHandle}
                      onChange={(e) =>
                        updateField('instagramHandle', e.target.value)
                      }
                      placeholder="instagram_handle"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Bio (full width) */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profile-bio">Bio</Label>
                  <textarea
                    id="profile-bio"
                    value={fields.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Creator bio..."
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    {fields.bio.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Read-only Social Links */}
              {(cp.youtubeUrl || cp.twitterUrl) && (
                <>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {cp.youtubeUrl && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          YouTube
                        </Label>
                        <a
                          href={cp.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {cp.youtubeUrl}
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    )}
                    {cp.twitterUrl && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Twitter
                        </Label>
                        <a
                          href={cp.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {cp.twitterUrl}
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              This user does not have a creator profile.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STATS SECTION                                                      */}
      {/* ================================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total Links
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {creator._count.links}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Collections
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {creator._count.collections}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Account Status
            </p>
            <div className="mt-2">
              {fields.isActive ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Profile Status
            </p>
            <div className="mt-2">
              {cp ? (
                fields.isApproved ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Approved
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Pending Approval
                  </Badge>
                )
              ) : (
                <Badge variant="secondary">No Profile</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* TIMESTAMPS                                                         */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Account Created
              </p>
              <p className="text-sm">{formatDateTime(creator.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Last Updated
              </p>
              <p className="text-sm">{formatDateTime(creator.updatedAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Last Login
              </p>
              <p className="text-sm">
                {creator.lastLogin
                  ? formatDateTime(creator.lastLogin)
                  : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
