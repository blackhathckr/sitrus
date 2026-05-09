/**
 * Shopify Webhook Receiver
 *
 * POST /api/webhooks/shopify
 *
 * Receives webhook events from Shopify for order lifecycle events.
 * Verifies HMAC-SHA256 signature using the app's client secret.
 *
 * Supported topics:
 * - orders/create — New order placed
 * - orders/updated — Order status changed (payment, fulfillment, cancellation)
 *
 * @module api/webhooks/shopify
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { EarningStatus } from '@prisma/client';
import { decrypt } from '@/lib/crypto/encryption';
import type { ShopifyOrder, ShopifyProduct } from '@/lib/integrations/shopify/types';

/**
 * Verify Shopify HMAC-SHA256 webhook signature.
 * Shopify signs the raw body with the app's client secret.
 */
async function verifyShopifyHmac(
  request: NextRequest,
  rawBody: string
): Promise<{ valid: boolean; shopDomain: string | null }> {
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
  const shopDomain = request.headers.get('x-shopify-shop-domain');

  if (!hmacHeader || !shopDomain) {
    return { valid: false, shopDomain: null };
  }

  // Find the integration by domain to get the client secret
  const integration = await prisma.brandIntegration.findFirst({
    where: { shopifyDomain: shopDomain },
    select: { shopifyClientSecEnc: true },
  });

  if (!integration?.shopifyClientSecEnc) {
    console.error(`[Shopify Webhook] No integration found for domain: ${shopDomain}`);
    return { valid: false, shopDomain };
  }

  const clientSecret = decrypt(integration.shopifyClientSecEnc);
  const computed = createHmac('sha256', clientSecret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return { valid: computed === hmacHeader, shopDomain };
}

/**
 * Map Shopify financial/fulfillment status to Sitrus order status.
 */
function mapShopifyStatus(order: ShopifyOrder): string {
  if (order.cancelled_at) return 'cancelled';
  if (order.fulfillment_status === 'fulfilled') return 'delivered';
  if (order.fulfillment_status === 'partial') return 'dispatched';
  if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') return 'confirmed';
  return 'placed';
}

/**
 * Extract UTM params from a Shopify order.
 * Checks landing_site first, then note_attributes (used by GoKwik and other checkout services).
 */
function extractUtmParams(order: ShopifyOrder): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
} {
  const empty = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null };

  // Try landing_site first
  if (order.landing_site) {
    try {
      const url = new URL(order.landing_site, 'https://placeholder.com');
      const utmSource = url.searchParams.get('utm_source');
      if (utmSource) {
        return {
          utmSource,
          utmMedium: url.searchParams.get('utm_medium'),
          utmCampaign: url.searchParams.get('utm_campaign'),
          utmContent: url.searchParams.get('utm_content'),
        };
      }
    } catch { /* fall through */ }
  }

  // Fallback: check note_attributes (GoKwik, custom checkouts store UTM here)
  if (order.note_attributes && order.note_attributes.length > 0) {
    const attrs = new Map(order.note_attributes.map((a) => [a.name, a.value]));
    const utmSource = attrs.get('utm_source') || null;
    if (utmSource) {
      return {
        utmSource,
        utmMedium: attrs.get('utm_medium') || null,
        utmCampaign: attrs.get('utm_campaign') || null,
        utmContent: attrs.get('utm_content') || null,
      };
    }
  }

  return empty;
}

function formatPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const { valid, shopDomain } = await verifyShopifyHmac(request, rawBody);

    if (!valid) {
      console.warn('[Shopify Webhook] HMAC verification failed for domain:', shopDomain);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const topic = request.headers.get('x-shopify-topic');

    console.log(`[Shopify Webhook] ${topic} from ${shopDomain}`);

    // Handle product events
    if (topic?.startsWith('products/')) {
      return handleProductWebhook(topic, rawBody, shopDomain!);
    }

    // Only process order events beyond this point
    if (!topic?.startsWith('orders/')) {
      return NextResponse.json({ status: 'ok', event: 'ignored' });
    }

    const order: ShopifyOrder = JSON.parse(rawBody);

    const utm = extractUtmParams(order);

    // Only process orders that came through Sitrus
    if (utm.utmSource !== 'sitrus') {
      return NextResponse.json({ status: 'ok', event: 'not_sitrus' });
    }

    // Find brand by shop domain
    const integration = await prisma.brandIntegration.findFirst({
      where: { shopifyDomain: shopDomain },
      select: { brandId: true },
    });

    if (!integration) {
      console.error(`[Shopify Webhook] No brand for domain: ${shopDomain}`);
      return NextResponse.json({ error: 'Unknown shop' }, { status: 400 });
    }

    const brandId = integration.brandId;
    const shopifyOrderId = String(order.id);
    const externalId = `shopify_${shopifyOrderId}`;
    const status = mapShopifyStatus(order);
    const orderValue = parseFloat(order.total_price) || 0;

    // Check if order already exists
    const existing = await prisma.brandOrder.findFirst({
      where: { easyecomOrderId: externalId },
      select: { id: true, status: true, creatorId: true, linkId: true, orderNumber: true },
    });

    if (existing) {
      // Update status if changed
      if (existing.status !== status) {
        await prisma.brandOrder.update({
          where: { id: existing.id },
          data: {
            status,
            fulfilledAt: status === 'delivered' ? new Date() : undefined,
          },
        });

        // Reconcile earnings
        if (existing.creatorId && existing.orderNumber) {
          const earning = await prisma.earning.findFirst({
            where: { description: { contains: existing.orderNumber } },
            select: { id: true, status: true },
          });

          if (earning) {
            // Update existing earning status
            let newEarningStatus: EarningStatus | null = null;
            if (status === 'delivered' && earning.status === EarningStatus.PENDING) newEarningStatus = EarningStatus.CONFIRMED;
            if (status === 'cancelled' && earning.status !== EarningStatus.PAID) newEarningStatus = EarningStatus.CANCELLED;

            if (newEarningStatus) {
              await prisma.earning.update({
                where: { id: earning.id },
                data: { status: newEarningStatus },
              });
            }
          } else if (['confirmed', 'dispatched', 'delivered'].includes(status)) {
            // No earning exists yet (order arrived as "placed") — create one now
            const brand = await prisma.brand.findUnique({
              where: { id: brandId },
              select: { commissionRate: true },
            });

            if (brand?.commissionRate) {
              await prisma.earning.create({
                data: {
                  creatorId: existing.creatorId,
                  linkId: existing.linkId,
                  amount: orderValue * (brand.commissionRate / 100),
                  status: status === 'delivered' ? EarningStatus.CONFIRMED : EarningStatus.PENDING,
                  period: formatPeriod(new Date()),
                  description: `Brand order #${existing.orderNumber}`,
                },
              });
            }
          }
        }
      }
      return NextResponse.json({ status: 'ok', event: 'order_updated' });
    }

    // New order — attribute via UTM
    let creatorId: string | null = null;
    let linkId: string | null = null;

    if (utm.utmContent) {
      const link = await prisma.link.findUnique({
        where: { shortCode: utm.utmContent },
        select: { id: true, creatorId: true },
      });
      if (link) {
        linkId = link.id;
        creatorId = link.creatorId;
      }
    }

    if (!creatorId && utm.utmCampaign) {
      const profile = await prisma.creatorProfile.findUnique({
        where: { slug: utm.utmCampaign },
        select: { userId: true },
      });
      if (profile) creatorId = profile.userId;
    }

    const customerName = order.customer
      ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(' ')
      : null;

    const brandOrder = await prisma.brandOrder.create({
      data: {
        brandId,
        easyecomOrderId: externalId,
        creatorId,
        linkId,
        utmSource: utm.utmSource,
        utmCampaign: utm.utmCampaign,
        utmMedium: utm.utmMedium,
        utmContent: utm.utmContent,
        orderNumber: order.name,
        customerName,
        customerEmail: order.customer?.email || null,
        orderValue,
        status,
        itemCount: order.line_items.length,
        orderedAt: new Date(order.created_at),
        fulfilledAt: order.fulfillment_status === 'fulfilled' ? new Date() : null,
        items: {
          create: order.line_items.map((item) => ({
            sku: item.sku || null,
            productName: item.title,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            totalPrice: parseFloat(item.price) * item.quantity,
          })),
        },
      },
    });

    // Auto-create earning for attributed confirmed+ orders
    if (creatorId && ['confirmed', 'dispatched', 'delivered'].includes(status)) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { commissionRate: true },
      });

      if (brand?.commissionRate) {
        const earningStatus = status === 'delivered' ? 'CONFIRMED' : 'PENDING';
        await prisma.earning.create({
          data: {
            creatorId,
            linkId,
            amount: orderValue * (brand.commissionRate / 100),
            status: earningStatus,
            period: formatPeriod(new Date(order.created_at)),
            description: `Brand order #${brandOrder.orderNumber}`,
          },
        });
      }
    }

    return NextResponse.json({ status: 'ok', event: 'order_created' }, { status: 201 });
  } catch (error) {
    console.error('[Shopify Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle products/create and products/update webhooks.
 * Creates or updates a Product record in Sitrus when a product is
 * added or changed on Shopify — fills the gap for products not in EasyEcom.
 */
async function handleProductWebhook(
  topic: string,
  rawBody: string,
  shopDomain: string
): Promise<NextResponse> {
  try {
    const product: ShopifyProduct = JSON.parse(rawBody);
    console.log(`[Shopify Webhook] ${topic} for product "${product.title}" from ${shopDomain}`);

    const integration = await prisma.brandIntegration.findFirst({
      where: { shopifyDomain: shopDomain },
      select: { brandId: true },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Unknown shop' }, { status: 400 });
    }

    const brand = await prisma.brand.findUnique({
      where: { id: integration.brandId },
      select: { websiteUrl: true, commissionRate: true },
    });

    const baseUrl = brand?.websiteUrl
      ? brand.websiteUrl.replace(/\/$/, '')
      : `https://${shopDomain}`;

    const productUrl = `${baseUrl}/products/${product.handle}`;
    const imageUrl = product.image?.src || product.images?.[0]?.src || null;
    const allImages = (product.images || []).map((img: { src: string }) => img.src);

    // Check if any variant SKU matches an existing EasyEcom product
    const variantSkus = product.variants
      .map((v) => v.sku?.trim().toUpperCase())
      .filter((s): s is string => !!s);

    if (variantSkus.length > 0) {
      const existingProducts = await prisma.product.findMany({
        where: {
          brandId: integration.brandId,
          easyecomSku: { in: variantSkus, mode: 'insensitive' },
        },
        select: { id: true, imageUrl: true, sourceUrl: true },
      });

      for (const existing of existingProducts) {
        const updates: Record<string, unknown> = {};
        if (imageUrl && existing.imageUrl.includes('placehold')) {
          updates.imageUrl = imageUrl;
          updates.images = allImages;
        }
        if (existing.sourceUrl !== productUrl) {
          updates.sourceUrl = productUrl;
        }
        if (Object.keys(updates).length > 0) {
          await prisma.product.update({ where: { id: existing.id }, data: updates });
        }
      }

      if (existingProducts.length > 0) {
        return NextResponse.json({ status: 'ok', event: 'product_updated_existing' });
      }
    }

    // No SKU match — check if Shopify-only product already exists by URL
    const existingByUrl = await prisma.product.findFirst({
      where: { brandId: integration.brandId, sourceUrl: productUrl },
    });

    if (existingByUrl) {
      // Update existing Shopify-only product
      const updates: Record<string, unknown> = {
        title: product.title,
        isActive: product.status === 'active',
      };
      if (imageUrl) {
        updates.imageUrl = imageUrl;
        updates.images = allImages;
      }
      const firstVariant = product.variants[0];
      if (firstVariant) {
        updates.price = parseFloat(firstVariant.price) || 0;
        const compareAt = firstVariant.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;
        if (compareAt && compareAt > (updates.price as number)) updates.originalPrice = compareAt;
      }
      updates.inStock = product.variants.some((v) => v.inventory_quantity > 0);

      await prisma.product.update({ where: { id: existingByUrl.id }, data: updates });
      return NextResponse.json({ status: 'ok', event: 'product_updated' });
    }

    // New Shopify-only product — create it
    if (product.status !== 'active') {
      return NextResponse.json({ status: 'ok', event: 'product_skipped_inactive' });
    }

    const firstVariant = product.variants[0];
    const price = firstVariant ? parseFloat(firstVariant.price) || 0 : 0;
    const compareAt = firstVariant?.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;
    const originalPrice = compareAt && compareAt > price ? compareAt : null;
    const totalStock = product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);

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
        brandId: integration.brandId,
        inStock: totalStock > 0,
        isActive: true,
        commissionRate: brand?.commissionRate,
      },
    });

    return NextResponse.json({ status: 'ok', event: 'product_created' }, { status: 201 });
  } catch (error) {
    console.error('[Shopify Webhook] Product event error:', error);
    return NextResponse.json({ error: 'Product webhook failed' }, { status: 500 });
  }
}
