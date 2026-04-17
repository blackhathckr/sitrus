/**
 * Shopify Order Sync & Attribution Service
 *
 * Fetches orders from Shopify, extracts UTM params from landing_site,
 * and creates/updates attributed BrandOrders in Sitrus.
 *
 * Attribution flow:
 * 1. Creator shares SitLink → customer clicks → redirects to Shopify with UTM params
 * 2. Shopify stores UTM in order.landing_site (e.g. /products/handle?utm_source=sitrus&utm_content=shortCode)
 * 3. This service reads landing_site, matches utm_content → SitLink shortCode → creator
 *
 * @module lib/integrations/shopify/order-sync
 */

import { prisma } from '@/lib/db/prisma';
import { EarningStatus } from '@prisma/client';
import { createShopifyClient } from './client';
import type { ShopifyOrder } from './types';

export interface ShopifyOrderSyncResult {
  totalFetched: number;
  created: number;
  updated: number;
  attributed: number;
  skipped: number;
  earningsCreated: number;
  errors: number;
  durationMs: number;
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

function formatPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Sync orders from Shopify for a given brand.
 * Only processes orders with utm_source=sitrus (came through SitLinks).
 * Updates existing orders if status has changed and reconciles earnings.
 */
export async function syncShopifyOrders(
  brandId: string,
  sinceDate?: string
): Promise<ShopifyOrderSyncResult> {
  const startTime = Date.now();
  let created = 0;
  let updated = 0;
  let attributed = 0;
  let skipped = 0;
  let earningsCreated = 0;
  let errors = 0;

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, commissionRate: true },
  });

  if (!brand) throw new Error(`Brand ${brandId} not found`);

  // Default to last 30 days
  const since = sinceDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const client = await createShopifyClient(brandId);
  const shopifyOrders = await client.getOrders(since);
  const totalFetched = shopifyOrders.length;

  for (const order of shopifyOrders) {
    try {
      const shopifyOrderId = String(order.id);
      const externalId = `shopify_${shopifyOrderId}`;

      // Extract UTM from landing_site
      const utm = extractUtmParams(order);

      // Only process orders that came through Sitrus
      if (utm.utmSource !== 'sitrus') {
        skipped++;
        continue;
      }

      const status = mapShopifyStatus(order);
      const orderValue = parseFloat(order.total_price) || 0;

      // Check if already synced
      const existingOrder = await prisma.brandOrder.findFirst({
        where: { easyecomOrderId: externalId },
        select: { id: true, status: true, creatorId: true },
      });

      if (existingOrder) {
        // Update if status changed
        if (existingOrder.status !== status) {
          await prisma.brandOrder.update({
            where: { id: existingOrder.id },
            data: {
              status,
              fulfilledAt: status === 'delivered' ? new Date() : undefined,
            },
          });
          updated++;

          // Reconcile earnings: update earning status when order status changes
          if (existingOrder.creatorId) {
            const earning = await prisma.earning.findFirst({
              where: { description: { contains: externalId.replace('shopify_', '') } },
              select: { id: true, status: true },
            });

            if (earning) {
              let newEarningStatus: EarningStatus | null = null;
              if (status === 'delivered' && earning.status === EarningStatus.PENDING) newEarningStatus = EarningStatus.CONFIRMED;
              else if (status === 'cancelled' && earning.status !== EarningStatus.PAID) newEarningStatus = EarningStatus.CANCELLED;

              if (newEarningStatus) {
                await prisma.earning.update({
                  where: { id: earning.id },
                  data: { status: newEarningStatus },
                });
              }
            }
          }
        } else {
          skipped++;
        }
        continue;
      }

      // Attribution: match utm_content (shortCode) → SitLink → creator
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

      // Fallback: match utm_campaign (creator slug) → creator
      if (!creatorId && utm.utmCampaign) {
        const profile = await prisma.creatorProfile.findUnique({
          where: { slug: utm.utmCampaign },
          select: { userId: true },
        });
        if (profile) creatorId = profile.userId;
      }

      if (creatorId) attributed++;

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

      created++;

      // Auto-create earning for attributed confirmed+ orders
      if (creatorId && brand.commissionRate && ['confirmed', 'dispatched', 'delivered'].includes(status)) {
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
        earningsCreated++;
      }
    } catch (err) {
      console.error(`[ShopifyOrderSync] Error processing order ${order.id}:`, err);
      errors++;
    }
  }

  // Update sync timestamp
  await prisma.brandIntegration.update({
    where: { brandId },
    data: { lastOrderSync: new Date() },
  });

  return {
    totalFetched,
    created,
    updated,
    attributed,
    skipped,
    earningsCreated,
    errors,
    durationMs: Date.now() - startTime,
  };
}
