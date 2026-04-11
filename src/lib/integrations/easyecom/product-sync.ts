/**
 * EasyEcom Product Sync Service
 *
 * Pulls the full product catalog from EasyEcom and upserts into Sitrus's
 * Product table. Products are matched by easyecomProductId (cp_id) for
 * idempotent syncs.
 *
 * @module lib/integrations/easyecom/product-sync
 */

import { prisma } from '@/lib/db/prisma';
import { createEasyEcomClient } from './client';
import type { EasyEcomProduct } from './types';

/** Result returned after a product sync run */
export interface ProductSyncResult {
  totalFetched: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: number;
  durationMs: number;
}

/**
 * Map an EasyEcom product to Sitrus Product fields.
 */
function mapEasyEcomProduct(
  product: EasyEcomProduct,
  brandId: string,
  websiteUrl: string | null,
  commissionRate: number | null
) {
  return {
    title: product.product_name || product.sku || `Product ${product.cp_id}`,
    description: product.description || null,
    imageUrl: product.product_image_url || 'https://placehold.co/400x400?text=No+Image',
    price: product.mrp ?? product.cost ?? 0,
    originalPrice: product.cost > 0 ? product.cost : null,
    currency: 'INR',
    sourceUrl: websiteUrl || 'https://izfworld.com',
    marketplace: null,
    category: product.category_name || 'Uncategorized',
    brand: product.brand || null,
    brandId,
    inStock: product.inventory > 0 || product.cp_inventory > 0,
    isActive: product.active === 1,
    commissionRate: commissionRate,
    easyecomProductId: String(product.cp_id),
    easyecomSku: product.sku,
    stockQuantity: Math.max(product.inventory || 0, product.cp_inventory || 0),
  };
}

/**
 * Sync all products from EasyEcom for a given brand.
 *
 * - Fetches all pages of products from EasyEcom
 * - Upserts each product by easyecomProductId
 * - Deactivates products that are no longer in EasyEcom
 * - Updates lastProductSync timestamp on the integration record
 *
 * @param brandId - The Sitrus brand ID to sync products for
 * @returns Sync result summary
 */
export async function syncProducts(brandId: string): Promise<ProductSyncResult> {
  const startTime = Date.now();
  let totalFetched = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;

  // Fetch brand metadata
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, websiteUrl: true, commissionRate: true },
  });

  if (!brand) {
    throw new Error(`Brand ${brandId} not found`);
  }

  const client = await createEasyEcomClient(brandId);

  // Track all synced easyecomProductIds to detect removed products
  const syncedIds = new Set<string>();

  // Paginate through all products
  for await (const batch of client.getAllProducts()) {
    totalFetched += batch.length;

    // Process batch in chunks to avoid overwhelming the DB
    const CHUNK_SIZE = 50;
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      const chunk = batch.slice(i, i + CHUNK_SIZE);

      const upsertPromises = chunk.map(async (eeProduct) => {
        try {
          const productData = mapEasyEcomProduct(
            eeProduct,
            brand.id,
            brand.websiteUrl,
            brand.commissionRate
          );

          const cpId = String(eeProduct.cp_id);
          syncedIds.add(cpId);

          const existing = await prisma.product.findUnique({
            where: { easyecomProductId: cpId },
            select: { id: true },
          });

          if (existing) {
            await prisma.product.update({
              where: { easyecomProductId: cpId },
              data: productData,
            });
            updated++;
          } else {
            await prisma.product.create({
              data: productData,
            });
            created++;
          }
        } catch (err) {
          console.error(`[ProductSync] Error syncing product cp_id=${eeProduct.cp_id}:`, err);
          errors++;
        }
      });

      await Promise.all(upsertPromises);
    }
  }

  // Deactivate products that were previously synced but no longer in EasyEcom
  const deactivateResult = await prisma.product.updateMany({
    where: {
      brandId,
      easyecomProductId: { not: null },
      ...(syncedIds.size > 0
        ? { easyecomProductId: { notIn: Array.from(syncedIds) } }
        : {}),
      isActive: true,
    },
    data: { isActive: false },
  });

  // Update sync timestamp
  await prisma.brandIntegration.update({
    where: { brandId },
    data: { lastProductSync: new Date() },
  });

  return {
    totalFetched,
    created,
    updated,
    deactivated: deactivateResult.count,
    errors,
    durationMs: Date.now() - startTime,
  };
}
