/**
 * Shopify Product Sync Service
 *
 * Fetches products from Shopify and syncs them to the Sitrus database.
 * Deduplicates against existing EasyEcom-synced products by SKU matching:
 * - If a Shopify variant SKU matches an existing product's easyecomSku → update (image, URL, price)
 * - If no SKU match → create a new Product record
 *
 * This ensures products available on Shopify but missing from EasyEcom
 * still appear in the Sitrus catalog.
 *
 * @module lib/integrations/shopify/product-sync
 */

import { prisma } from '@/lib/db/prisma';
import { createShopifyClient } from './client';
import type { ShopifyProduct } from './types';

export interface ShopifyProductSyncResult {
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

/**
 * Sync products from Shopify for a given brand.
 *
 * Strategy:
 * 1. Fetch all Shopify products (product-level, not variant-level)
 * 2. For each product, check if any variant SKU already exists in Sitrus (easyecomSku)
 * 3. If match → update image/URL/price on existing record
 * 4. If no match → create one Product record per Shopify product (not per variant)
 */
export async function syncShopifyProducts(
  brandId: string
): Promise<ShopifyProductSyncResult> {
  const startTime = Date.now();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, websiteUrl: true, commissionRate: true },
  });

  if (!brand) throw new Error(`Brand ${brandId} not found`);

  const integration = await prisma.brandIntegration.findUnique({
    where: { brandId },
    select: { shopifyDomain: true },
  });

  const baseUrl = brand.websiteUrl
    ? brand.websiteUrl.replace(/\/$/, '')
    : `https://${integration?.shopifyDomain}`;

  const client = await createShopifyClient(brandId);
  const shopifyProducts = await client.getAllProducts();
  const totalFetched = shopifyProducts.length;

  // Build a set of all existing SKUs in the DB for this brand for fast lookup
  const existingProducts = await prisma.product.findMany({
    where: { brandId, easyecomSku: { not: null } },
    select: { id: true, title: true, easyecomSku: true, imageUrl: true, sourceUrl: true },
  });

  const skuToProduct = new Map<string, { id: string; title: string; imageUrl: string; sourceUrl: string }>();
  for (const p of existingProducts) {
    if (p.easyecomSku) {
      skuToProduct.set(p.easyecomSku.trim().toUpperCase(), {
        id: p.id,
        title: p.title,
        imageUrl: p.imageUrl,
        sourceUrl: p.sourceUrl,
      });
    }
  }

  // Also track existing Shopify product IDs to avoid creating duplicates on re-sync
  const existingByShopifyId = await prisma.product.findMany({
    where: {
      brandId,
      sourceUrl: { startsWith: baseUrl },
      easyecomProductId: null, // Shopify-only products (no EasyEcom link)
    },
    select: { id: true, sourceUrl: true },
  });

  const existingSourceUrls = new Set(existingByShopifyId.map((p) => p.sourceUrl));

  for (const product of shopifyProducts) {
    try {
      // Skip draft/archived products
      if (product.status !== 'active') {
        skipped++;
        continue;
      }

      const productUrl = `${baseUrl}/products/${product.handle}`;
      const imageUrl = product.image?.src || product.images?.[0]?.src || null;
      const allImages = (product.images || []).map((img) => img.src);

      // Collect all SKUs for this Shopify product
      const variantSkus = product.variants
        .map((v) => v.sku?.trim().toUpperCase())
        .filter((s): s is string => !!s);

      // Check if any variant SKU matches an existing EasyEcom product
      let matched = false;
      for (const sku of variantSkus) {
        const existing = skuToProduct.get(sku);
        if (existing) {
          matched = true;
          // Update existing product with better data from Shopify
          const updates: Record<string, unknown> = {};
          const isPlaceholder = existing.imageUrl.includes('placehold');

          // Update title if it looks like a SKU code (e.g. "Z664-B") and Shopify has a proper name
          const isSKUTitle = /^[A-Z0-9][A-Z0-9-]*$/.test(existing.title.trim());
          if (isSKUTitle && product.title) {
            updates.title = product.title;
          }
          if (imageUrl && isPlaceholder) {
            updates.imageUrl = imageUrl;
          }
          if (allImages.length > 0 && isPlaceholder) {
            updates.images = allImages;
          }
          if (existing.sourceUrl !== productUrl) {
            updates.sourceUrl = productUrl;
          }

          if (Object.keys(updates).length > 0) {
            await prisma.product.update({
              where: { id: existing.id },
              data: updates,
            });
            updated++;
          } else {
            skipped++;
          }
        }
      }

      // If no SKU matched any existing product, this is a Shopify-only product
      if (!matched) {
        // Check if we already created it in a previous Shopify sync
        if (existingSourceUrls.has(productUrl)) {
          skipped++;
          continue;
        }

        // Calculate price from first variant
        const firstVariant = product.variants[0];
        const price = firstVariant ? parseFloat(firstVariant.price) || 0 : 0;
        const compareAt = firstVariant?.compare_at_price
          ? parseFloat(firstVariant.compare_at_price)
          : null;
        const originalPrice = compareAt && compareAt > price ? compareAt : null;

        // Check stock across all variants
        const totalStock = product.variants.reduce(
          (sum, v) => sum + (v.inventory_quantity || 0),
          0
        );

        await prisma.product.create({
          data: {
            title: product.title,
            imageUrl: imageUrl || 'https://placehold.co/400x400?text=No+Image',
            images: allImages,
            price,
            originalPrice,
            sourceUrl: productUrl,
            category: product.product_type || 'Uncategorized',
            brand: product.vendor || null,
            brandId,
            inStock: totalStock > 0,
            isActive: true,
            commissionRate: brand.commissionRate,
          },
        });

        created++;
        existingSourceUrls.add(productUrl);
      }
    } catch (err) {
      console.error(
        `[ShopifyProductSync] Error processing product ${product.id} (${product.title}):`,
        err
      );
      errors++;
    }
  }

  // Update sync timestamp
  await prisma.brandIntegration.update({
    where: { brandId },
    data: { lastProductSync: new Date() },
  });

  return {
    totalFetched,
    created,
    updated,
    skipped,
    errors,
    durationMs: Date.now() - startTime,
  };
}
