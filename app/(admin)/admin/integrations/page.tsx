/**
 * Admin Brand Integrations Page
 *
 * Manage EasyEcom integrations for brands. Admin can connect brands
 * to EasyEcom, trigger product/inventory/order syncs, and view sync status.
 *
 * @module app/(admin)/admin/integrations/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Loader2,
  RefreshCw,
  Package,
  BarChart3,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLottie } from '@/components/ui/page-lottie';

// =============================================================================
// TYPES
// =============================================================================

interface Integration {
  id: string;
  brandId: string;
  provider: string;
  locationKey: string;
  syncEnabled: boolean;
  lastProductSync: string | null;
  lastInventorySync: string | null;
  lastOrderSync: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface IntegrationForm {
  brandId: string;
  provider: string;
  apiKey: string;
  email: string;
  password: string;
  locationKey: string;
}

const EMPTY_FORM: IntegrationForm = {
  brandId: '',
  provider: 'easyecom',
  apiKey: '',
  email: '',
  password: '',
  locationKey: '',
};

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isTokenValid(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<IntegrationForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingProduct, setSyncingProduct] = useState<string | null>(null);
  const [syncingInventory, setSyncingInventory] = useState<string | null>(null);
  const [syncingOrders, setSyncingOrders] = useState<string | null>(null);

  // ---- Data fetching -------------------------------------------------------

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/integrations');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setIntegrations(json.data);
    } catch (err) {
      console.error('[Integrations] fetch error:', err);
      toast.error('Failed to load integrations');
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setBrands(json.data);
    } catch (err) {
      console.error('[Brands] fetch error:', err);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await Promise.all([fetchIntegrations(), fetchBrands()]);
      setIsLoading(false);
    }
    load();
  }, [fetchIntegrations, fetchBrands]);

  // ---- Sync handlers -------------------------------------------------------

  async function handleSyncProducts(brandId: string) {
    setSyncingProduct(brandId);
    try {
      const res = await fetch(`/api/admin/integrations/${brandId}/sync-products`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Sync failed');
      }
      const json = await res.json();
      toast.success(
        `Product sync complete: ${json.data.created} created, ${json.data.updated} updated (${(json.data.durationMs / 1000).toFixed(1)}s)`
      );
      await fetchIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Product sync failed');
    } finally {
      setSyncingProduct(null);
    }
  }

  async function handleSyncInventory(brandId: string) {
    setSyncingInventory(brandId);
    try {
      const res = await fetch(`/api/admin/integrations/${brandId}/sync-inventory`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Sync failed');
      }
      const json = await res.json();
      toast.success(
        `Inventory sync complete: ${json.data.updated} updated`
      );
      await fetchIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Inventory sync failed');
    } finally {
      setSyncingInventory(null);
    }
  }

  async function handleSyncOrders(brandId: string) {
    setSyncingOrders(brandId);
    try {
      const res = await fetch(`/api/admin/integrations/${brandId}/sync-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Sync failed');
      }
      const json = await res.json();
      toast.success(
        `Order sync complete: ${json.data.created} new, ${json.data.attributed} attributed`
      );
      await fetchIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Order sync failed');
    } finally {
      setSyncingOrders(null);
    }
  }

  // ---- Create handler ------------------------------------------------------

  async function handleSave() {
    if (!form.brandId || !form.apiKey || !form.email || !form.password || !form.locationKey) {
      toast.error('All fields are required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to create integration');
      }

      toast.success('Integration created');
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await fetchIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create integration');
    } finally {
      setIsSaving(false);
    }
  }

  // ---- Loading state -------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <PageLottie name="analytics" description="Loading integrations..." />
      </div>
    );
  }

  // Get brands that don't already have integrations
  const connectedBrandIds = new Set(integrations.map((i) => i.brandId));
  const availableBrands = brands.filter((b) => !connectedBrandIds.has(b.id));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Manage EasyEcom connections for brands ({integrations.length} connected)
          </p>
        </div>
        <Button
          className="gap-1.5"
          onClick={() => setDialogOpen(true)}
          disabled={availableBrands.length === 0}
        >
          <Plus className="size-4" />
          Connect Brand
        </Button>
      </div>

      {/* Integration Cards */}
      {integrations.length === 0 ? (
        <PageLottie
          name="analytics"
          description="No integrations yet. Connect a brand to EasyEcom to start syncing products."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              disabled={availableBrands.length === 0}
            >
              <Plus className="mr-1.5 size-4" />
              Connect Brand
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {integration.brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={integration.brand.logoUrl}
                        alt={integration.brand.name}
                        className="size-10 shrink-0 rounded object-contain"
                      />
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-sm font-bold">
                        {integration.brand.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{integration.brand.name}</CardTitle>
                      <CardDescription>
                        Provider: {integration.provider.toUpperCase()} &middot; Location: {integration.locationKey}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTokenValid(integration.tokenExpiresAt) ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="mr-1 size-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="mr-1 size-3" />
                        Token Expired
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Sync Status Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sync Type</TableHead>
                      <TableHead>Last Synced</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Product Sync */}
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="size-4 text-muted-foreground" />
                          <span className="font-medium">Products</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="size-3 text-muted-foreground" />
                          {formatDate(integration.lastProductSync)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleSyncProducts(integration.brandId)}
                          disabled={syncingProduct === integration.brandId}
                        >
                          {syncingProduct === integration.brandId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          Sync Products
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Inventory Sync */}
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="size-4 text-muted-foreground" />
                          <span className="font-medium">Inventory</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="size-3 text-muted-foreground" />
                          {formatDate(integration.lastInventorySync)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleSyncInventory(integration.brandId)}
                          disabled={syncingInventory === integration.brandId}
                        >
                          {syncingInventory === integration.brandId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          Sync Inventory
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Order Sync */}
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="size-4 text-muted-foreground" />
                          <span className="font-medium">Orders</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="size-3 text-muted-foreground" />
                          {formatDate(integration.lastOrderSync)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleSyncOrders(integration.brandId)}
                          disabled={syncingOrders === integration.brandId}
                        >
                          {syncingOrders === integration.brandId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          Sync Orders
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Integration Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setForm(EMPTY_FORM);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Brand to EasyEcom</DialogTitle>
            <DialogDescription>
              Enter the EasyEcom API credentials for this brand. Credentials are encrypted before storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Brand *</Label>
              <Select
                value={form.brandId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, brandId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="int-apikey">API Key (x-api-key) *</Label>
              <Input
                id="int-apikey"
                placeholder="e.g. 9eaa6039c1f58f..."
                value={form.apiKey}
                onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="int-email">API User Email *</Label>
                <Input
                  id="int-email"
                  type="email"
                  placeholder="api-user@company.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="int-password">Password *</Label>
                <Input
                  id="int-password"
                  type="password"
                  placeholder="API user password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="int-location">Location Key *</Label>
              <Input
                id="int-location"
                placeholder="e.g. en5114252196"
                value={form.locationKey}
                onChange={(e) => setForm((prev) => ({ ...prev, locationKey: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
              Credentials are AES-256 encrypted before storage. They are never stored or returned in plaintext.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
