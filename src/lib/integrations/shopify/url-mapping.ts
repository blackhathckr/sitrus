/**
 * Shopify Product URL Mapping Service
 *
 * Fetches all products from Shopify, matches them by SKU to EasyEcom-synced
 * products in Sitrus, and updates sourceUrl to the actual Shopify product page.
 *
 * @module lib/integrations/shopify/url-mapping
 */

import { prisma } from '@/lib/db/prisma';
import { createShopifyClient } from './client';

export interface UrlMappingResult {
  totalShopifyProducts: number;
  totalSitrusProducts: number;
  matched: number;
  unmatched: number;
  updated: number;
  errors: number;
  durationMs: number;
}

/**
 * Map Shopify product URLs to Sitrus products by SKU matching.
 */
export async function mapShopifyUrls(brandId: string): Promise<UrlMappingResult> {
  const startTime = Date.now();
  let matched = 0;
  let unmatched = 0;
  let updated = 0;
  let errors = 0;

  // Get the brand's website URL for public-facing product URLs
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { websiteUrl: true },
  });

  const integration = await prisma.brandIntegration.findUnique({
    where: { brandId },
    select: { shopifyDomain: true },
  });

  // Use brand.websiteUrl if available, otherwise fall back to shopifyDomain
  const baseUrl = brand?.websiteUrl
    ? brand.websiteUrl.replace(/\/$/, '')
    : `https://${integration?.shopifyDomain}`;

  // Fetch all Shopify products
  const client = await createShopifyClient(brandId);
  const shopifyProducts = await client.getAllProducts();

  // Build SKU → product URL map from Shopify variants
  const skuToUrl = new Map<string, string>();
  for (const product of shopifyProducts) {
    const productUrl = `${baseUrl}/products/${product.handle}`;
    for (const variant of product.variants) {
      if (variant.sku) {
        skuToUrl.set(variant.sku.trim().toUpperCase(), productUrl);
      }
    }
  }

  // Fetch all Sitrus products for this brand with easyecomSku
  const sitrusProducts = await prisma.product.findMany({
    where: { brandId, easyecomSku: { not: null } },
    select: { id: true, easyecomSku: true, sourceUrl: true },
  });

  // Match and update in chunks
  const CHUNK_SIZE = 50;
  for (let i = 0; i < sitrusProducts.length; i += CHUNK_SIZE) {
    const chunk = sitrusProducts.slice(i, i + CHUNK_SIZE);

    const updatePromises = chunk.map(async (product) => {
      try {
        const normalizedSku = product.easyecomSku!.trim().toUpperCase();
        const shopifyUrl = skuToUrl.get(normalizedSku);

        if (shopifyUrl) {
          matched++;
          // Only update if URL is different
          if (product.sourceUrl !== shopifyUrl) {
            await prisma.product.update({
              where: { id: product.id },
              data: { sourceUrl: shopifyUrl },
            });
            updated++;
          }
        } else {
          unmatched++;
        }
      } catch (err) {
        console.error(`[UrlMapping] Error mapping product ${product.id}:`, err);
        errors++;
      }
    });

    await Promise.all(updatePromises);
  }

  return {
    totalShopifyProducts: shopifyProducts.length,
    totalSitrusProducts: sitrusProducts.length,
    matched,
    unmatched,
    updated,
    errors,
    durationMs: Date.now() - startTime,
  };
}
