/**
 * Admin Brand Management Page
 *
 * CRUD interface for managing the brand master data.
 * Brands are referenced by products. Admin can create, edit,
 * activate/deactivate, and delete brands.
 *
 * @module app/(admin)/admin/brands/page
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Loader2, Tag, Upload, X } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageLottie } from '@/components/ui/page-lottie';

// =============================================================================
// TYPES
// =============================================================================

interface Brand {
  id: string;
  name: string;
  slug: string;
  registeredName: string | null;
  displayName: string | null;
  logoUrl: string | null;
  gstin: string | null;
  contactPOC: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { products: number };
}

interface BrandForm {
  name: string;
  slug: string;
  registeredName: string;
  displayName: string;
  logoUrl: string;
  gstin: string;
  contactPOC: string;
  contactPhone: string;
  isActive: boolean;
}

const EMPTY_FORM: BrandForm = {
  name: '',
  slug: '',
  registeredName: '',
  displayName: '',
  logoUrl: '',
  gstin: '',
  contactPOC: '',
  contactPhone: '',
  isActive: true,
};

// =============================================================================
// HELPERS
// =============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ---- Data fetching -------------------------------------------------------

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands');
      if (!res.ok) throw new Error('Failed to fetch brands');
      const json = await res.json();
      setBrands(json.data);
    } catch (err) {
      console.error('[Brands] fetch error:', err);
      toast.error('Failed to load brands');
    }
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await fetchBrands();
      setIsLoading(false);
    }
    load();
  }, [fetchBrands]);

  // ---- Logo upload ---------------------------------------------------------

  async function handleLogoUpload(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'brands');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Upload failed');
      }

      const { url } = await res.json();
      setForm((prev) => ({ ...prev, logoUrl: url }));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  }

  function handleRemoveLogo() {
    // If current logo is an Azure blob and we're editing, it'll be cleaned up on save
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  // ---- Handlers ------------------------------------------------------------

  function openCreateDialog() {
    setEditingBrand(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(brand: Brand) {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      registeredName: brand.registeredName ?? '',
      displayName: brand.displayName ?? '',
      logoUrl: brand.logoUrl ?? '',
      gstin: brand.gstin ?? '',
      contactPOC: brand.contactPOC ?? '',
      contactPhone: brand.contactPhone ?? '',
      isActive: brand.isActive,
    });
    setDialogOpen(true);
  }

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      // Only auto-generate slug for new brands
      ...(editingBrand ? {} : { slug: slugify(value) }),
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Brand name is required');
      return;
    }
    if (!form.slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        registeredName: form.registeredName.trim() || null,
        displayName: form.displayName.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        gstin: form.gstin.trim() || null,
        contactPOC: form.contactPOC.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        isActive: form.isActive,
      };

      const url = editingBrand
        ? `/api/brands/${editingBrand.id}`
        : '/api/brands';
      const method = editingBrand ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to save brand');
      }

      toast.success(editingBrand ? 'Brand updated' : 'Brand created');
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingBrand(null);
      await fetchBrands();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save brand');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(brand: Brand) {
    if (brand._count.products > 0) {
      if (
        !confirm(
          `"${brand.name}" has ${brand._count.products} product(s). Deleting will unlink them. Continue?`
        )
      )
        return;
    } else {
      if (!confirm(`Delete brand "${brand.name}"?`)) return;
    }

    setIsDeleting(brand.id);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Brand deleted');
      await fetchBrands();
    } catch {
      toast.error('Failed to delete brand');
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleToggleActive(brand: Brand) {
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !brand.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(`Brand ${brand.isActive ? 'deactivated' : 'activated'}`);
      await fetchBrands();
    } catch {
      toast.error('Failed to update brand status');
    }
  }

  // ---- Loading state -------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <PageLottie name="analytics" description="Loading brands..." />
      </div>
    );
  }

  // ---- Filtered data -------------------------------------------------------

  const filtered = search
    ? brands.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.slug.toLowerCase().includes(search.toLowerCase())
      )
    : brands;

  // ---- Render --------------------------------------------------------------

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            Manage the brand master data ({brands.length} brands)
          </p>
        </div>
        <Button className="gap-1.5" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Brand
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {filtered.length === 0 ? (
        <PageLottie
          name="analytics"
          description={
            search
              ? 'No brands match your search'
              : 'No brands yet. Add your first brand.'
          }
          action={
            !search ? (
              <Button variant="outline" size="sm" onClick={openCreateDialog}>
                <Plus className="mr-1.5 size-4" />
                Add Brand
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Brands</CardTitle>
            <CardDescription>
              {filtered.length} brand{filtered.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {brand.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="size-8 shrink-0 rounded object-contain"
                          />
                        ) : (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                            <Tag className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium">{brand.name}</span>
                          {brand.registeredName && (
                            <p className="text-xs text-muted-foreground">{brand.registeredName}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {brand.displayName || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {brand.gstin || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {brand.contactPOC ? (
                        <div>
                          <p>{brand.contactPOC}</p>
                          {brand.contactPhone && (
                            <p className="text-xs text-muted-foreground">{brand.contactPhone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {brand._count.products}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={brand.isActive}
                        onCheckedChange={() => handleToggleActive(brand)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditDialog(brand)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(brand)}
                          disabled={isDeleting === brand.id}
                        >
                          {isDeleting === brand.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingBrand(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </DialogTitle>
            <DialogDescription>
              {editingBrand
                ? 'Update brand details.'
                : 'Create a new brand in the master data.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand Name *</Label>
                <Input
                  id="brand-name"
                  placeholder="e.g. Nike"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-slug">Slug *</Label>
                <Input
                  id="brand-slug"
                  placeholder="e.g. nike"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand-registered-name">Registered Name</Label>
                <Input
                  id="brand-registered-name"
                  placeholder="e.g. Nike Inc."
                  value={form.registeredName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, registeredName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-display-name">Display Name</Label>
                <Input
                  id="brand-display-name"
                  placeholder="e.g. NIKE"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-gstin">GSTIN</Label>
              <Input
                id="brand-gstin"
                placeholder="e.g. 27AABCU9603R1ZM"
                value={form.gstin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))
                }
                maxLength={15}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand-poc">Contact POC</Label>
                <Input
                  id="brand-poc"
                  placeholder="e.g. John Doe"
                  value={form.contactPOC}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contactPOC: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-phone">Phone Number</Label>
                <Input
                  id="brand-phone"
                  placeholder="e.g. +91 98765 43210"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Brand Logo</Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
              {form.logoUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logoUrl}
                    alt="Brand logo"
                    className="size-16 rounded border object-contain"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 size-3.5" />
                      )}
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      <X className="mr-1.5 size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 size-4" />
                  )}
                  Upload Logo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP. Max 5MB.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="brand-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive brands won&apos;t appear in product filters
                </p>
              </div>
              <Switch
                id="brand-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {editingBrand ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
