/**
 * Profile Settings Page
 *
 * Allows the authenticated creator to view and edit their profile
 * details including personal information, social links, avatar, and
 * banner. Avatar and banner are uploaded to Azure Blob Storage.
 *
 * @module dashboard/profile
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Save,
  User,
  Loader2,
  Instagram,
  Youtube,
  Upload,
  Trash2,
  ImageIcon,
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

interface ProfileFormData {
  name: string;
  displayName: string;
  bio: string;
  tagline: string;
  slug: string;
  instagramHandle: string;
  youtubeUrl: string;
  avatarUrl: string;
  bannerUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    avatarUrl: cp.avatarUrl ?? '',
    bannerUrl: cp.bannerUrl ?? '',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [form, setForm] = useState<ProfileFormData>({
    name: '',
    displayName: '',
    bio: '',
    tagline: '',
    slug: '',
    instagramHandle: '',
    youtubeUrl: '',
    avatarUrl: '',
    bannerUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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

  function handleChange(field: keyof ProfileFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /**
   * Uploads a file to the server and updates the form field.
   */
  async function handleFileUpload(
    file: File,
    folder: 'avatars' | 'banners',
    field: 'avatarUrl' | 'bannerUrl'
  ) {
    const setUploading = folder === 'avatars' ? setIsUploadingAvatar : setIsUploadingBanner;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Upload failed');
      }

      const json = await res.json();
      setForm((prev) => ({ ...prev, [field]: json.url }));
      toast.success(`${folder === 'avatars' ? 'Avatar' : 'Banner'} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  /**
   * Removes the avatar or banner (sets URL to empty so backend clears it and deletes blob).
   */
  function handleRemoveImage(field: 'avatarUrl' | 'bannerUrl') {
    setForm((prev) => ({ ...prev, [field]: '' }));
    toast.info(
      `${field === 'avatarUrl' ? 'Avatar' : 'Banner'} will be removed when you save`
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload: Record<string, string | null | undefined> = {
        name: form.name || undefined,
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
        tagline: form.tagline || undefined,
        slug: form.slug || undefined,
        instagramHandle: form.instagramHandle || undefined,
        youtubeUrl: form.youtubeUrl || undefined,
      };

      // Avatar: send null to clear, URL to set, omit to leave unchanged
      if (form.avatarUrl === '' && profile?.creatorProfile?.avatarUrl) {
        payload.avatarUrl = null; // Clear it
      } else if (form.avatarUrl && form.avatarUrl !== profile?.creatorProfile?.avatarUrl) {
        payload.avatarUrl = form.avatarUrl; // Update
      }

      // Banner: same logic
      if (form.bannerUrl === '' && profile?.creatorProfile?.bannerUrl) {
        payload.bannerUrl = null;
      } else if (form.bannerUrl && form.bannerUrl !== profile?.creatorProfile?.bannerUrl) {
        payload.bannerUrl = form.bannerUrl;
      }

      // Remove undefined keys
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
      // Sync form with latest saved data
      if (json.data) {
        setForm(profileToFormData({ ...profile!, ...json.data, creatorProfile: json.data.creatorProfile }));
      }
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
        <PageLottie name="profile" description="Loading your profile..." />
      </div>
    );
  }

  // ---- Render --------------------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your creator profile and social links
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
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
        {/* Left column: Avatar + Banner                                   */}
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
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'avatars', 'avatarUrl');
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  {form.avatarUrl ? 'Replace' : 'Upload'}
                </Button>
                {form.avatarUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveImage('avatarUrl')}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                JPEG, PNG, or WebP. Max 5MB.
              </p>
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
                    <ImageIcon className="mr-2 size-4" />
                    No banner set
                  </div>
                )}
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'banners', 'bannerUrl');
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isUploadingBanner}
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {isUploadingBanner ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  {form.bannerUrl ? 'Replace' : 'Upload'}
                </Button>
                {form.bannerUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveImage('bannerUrl')}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP. Max 10MB. Recommended 1200x400px.
              </p>
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
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
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

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  placeholder="A short one-liner about you"
                  value={form.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                />
              </div>
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
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
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
