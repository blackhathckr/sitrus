/**
 * Profile Settings Page
 *
 * Allows the authenticated creator to view and edit their profile
 * details including personal information, social links, avatar, and
 * banner. Persists changes via PUT /api/creators/me.
 *
 * @module dashboard/profile
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Save,
  User,
  Loader2,
  Instagram,
  Youtube,
  Twitter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageLottie } from '@/components/ui/page-lottie';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Full profile response from GET /api/creators/me. */
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

/**
 * Mutable subset of the profile used to drive the form.
 *
 * Keeps keys identical to what the PUT endpoint accepts so the
 * payload can be sent directly.
 */
interface ProfileFormData {
  name: string;
  displayName: string;
  bio: string;
  tagline: string;
  slug: string;
  instagramHandle: string;
  youtubeUrl: string;
  twitterUrl: string;
  avatarUrl: string;
  bannerUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the initial form state from the API response, converting
 * nullable fields to empty strings for controlled inputs.
 */
function profileToFormData(profile: CreatorProfile): ProfileFormData {
  const cp = profile.creatorProfile;
  return {
    name: profile.name ?? '',
    displayName: cp.displayName ?? '',
    bio: cp.bio ?? '',
    tagline: cp.tagline ?? '',
    slug: cp.slug ?? '',
    instagramHandle: cp.instagramHandle ?? '',
    youtubeUrl: cp.youtubeUrl ?? '',
    twitterUrl: cp.twitterUrl ?? '',
    avatarUrl: cp.avatarUrl ?? '',
    bannerUrl: cp.bannerUrl ?? '',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  // ---- State ---------------------------------------------------------------
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [form, setForm] = useState<ProfileFormData>({
    name: '',
    displayName: '',
    bio: '',
    tagline: '',
    slug: '',
    instagramHandle: '',
    youtubeUrl: '',
    twitterUrl: '',
    avatarUrl: '',
    bannerUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ---- Data fetching -------------------------------------------------------

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/creators/me');
        if (!res.ok) throw new Error('Failed to fetch profile');
        const json = await res.json();
        const data: CreatorProfile = json.data;
        setProfile(data);
        setForm(profileToFormData(data));
      } catch (err) {
        console.error('[Profile] fetchProfile error:', err);
        toast.error('Failed to load your profile');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // ---- Handlers ------------------------------------------------------------

  /**
   * Generic change handler that updates a single form field.
   */
  function handleChange(
    field: keyof ProfileFormData,
    value: string,
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /**
   * Persists the form data to the server via PUT /api/creators/me.
   * Only sends fields that the API expects. Shows a success or error
   * toast depending on the outcome.
   */
  async function handleSave() {
    setIsSaving(true);
    try {
      const payload: Record<string, string | undefined> = {
        name: form.name || undefined,
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
        tagline: form.tagline || undefined,
        slug: form.slug || undefined,
        instagramHandle: form.instagramHandle || undefined,
        youtubeUrl: form.youtubeUrl || undefined,
        twitterUrl: form.twitterUrl || undefined,
        avatarUrl: form.avatarUrl || undefined,
        bannerUrl: form.bannerUrl || undefined,
      };

      // Remove undefined keys so the API does not overwrite with null
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined),
      );

      const res = await fetch('/api/creators/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to save profile');
      }

      const json = await res.json();
      setProfile((prev) =>
        prev
          ? { ...prev, ...json.data, creatorProfile: json.data.creatorProfile }
          : prev,
      );
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('[Profile] handleSave error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to save profile',
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ---- Loading state -------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <PageLottie
          name="profile"
          description="Loading your profile..."
        />
      </div>
    );
  }

  // ---- Render --------------------------------------------------------------

  const cp = profile?.creatorProfile;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your creator profile and social links
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ============================================================== */}
        {/* Left column: Avatar + Banner preview                           */}
        {/* ============================================================== */}
        <div className="space-y-6 lg:col-span-1">
          {/* Avatar card */}
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>
                Your profile picture shown on your storefront
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="size-24 overflow-hidden rounded-full border-2 border-dashed bg-muted">
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.avatarUrl}
                    alt="Avatar preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <User className="size-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="w-full space-y-2">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  placeholder="https://example.com/avatar.jpg"
                  value={form.avatarUrl}
                  onChange={(e) => handleChange('avatarUrl', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Banner card */}
          <Card>
            <CardHeader>
              <CardTitle>Banner</CardTitle>
              <CardDescription>
                Header image for your storefront page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-28 w-full overflow-hidden rounded-md border-2 border-dashed bg-muted">
                {form.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.bannerUrl}
                    alt="Banner preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    No banner set
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-url">Banner URL</Label>
                <Input
                  id="banner-url"
                  placeholder="https://example.com/banner.jpg"
                  value={form.bannerUrl}
                  onChange={(e) => handleChange('bannerUrl', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* Right column: Form fields                                      */}
        {/* ============================================================== */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Your public-facing creator details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  placeholder="How you appear on your storefront"
                  value={form.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The name shown publicly on your storefront. Falls back to your
                  account name if empty.
                </p>
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    sitrus.club/
                  </span>
                  <Input
                    id="slug"
                    placeholder="your-slug"
                    value={form.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your unique storefront URL. Use only lowercase letters,
                  numbers, and hyphens.
                </p>
              </div>

              <Separator />

              {/* Tagline */}
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  placeholder="A short one-liner about you"
                  value={form.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell your audience a bit about yourself..."
                  value={form.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Instagram Handle */}
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Handle</Label>
                <div className="flex items-center gap-2">
                  <Instagram className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="instagram"
                    placeholder="yourhandle"
                    value={form.instagramHandle}
                    onChange={(e) =>
                      handleChange('instagramHandle', e.target.value)
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Without the @ symbol.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Social links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Additional social media profiles to display on your storefront
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* YouTube */}
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube URL</Label>
                <div className="flex items-center gap-2">
                  <Youtube className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="youtube"
                    placeholder="https://youtube.com/@yourchannel"
                    value={form.youtubeUrl}
                    onChange={(e) => handleChange('youtubeUrl', e.target.value)}
                  />
                </div>
              </div>

              {/* Twitter / X */}
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter URL</Label>
                <div className="flex items-center gap-2">
                  <Twitter className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="twitter"
                    placeholder="https://twitter.com/yourhandle"
                    value={form.twitterUrl}
                    onChange={(e) => handleChange('twitterUrl', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save button (bottom, for convenience on long forms) */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
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
        </div>
      </div>
    </div>
  );
}
