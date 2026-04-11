/**
 * EasyEcom Order Sync Service
 *
 * Fetches orders from EasyEcom, matches them to creators via UTM attribution,
 * and creates BrandOrder records in Sitrus. Auto-generates Earning records
 * for attributed orders.
 *
 * @module lib/integrations/easyecom/order-sync
 */

import { prisma } from '@/lib/db/prisma';
import { createEasyEcomClient } from './client';
import type { EasyEcomOrder } from './types';

/** Result returned after an order sync run */
export interface OrderSyncResult {
  totalFetched: number;
  created: number;
  updated: number;
  attributed: number;
  earningsCreated: number;
  errors: number;
  durationMs: number;
}

/** Map EasyEcom order status to Sitrus status */
function mapOrderStatus(eeStatus: string): string {
  const normalized = eeStatus.toLowerCase().trim();

  if (normalized.includes('new') || normalized.includes('created')) return 'placed';
  if (normalized.includes('confirm')) return 'confirmed';
  if (normalized.includes('ready') || normalized.includes('dispatch')) return 'dispatched';
  if (normalized.includes('manifest') || normalized.includes('ship')) return 'dispatched';
  if (normalized.includes('deliver')) return 'delivered';
  if (normalized.includes('cancel')) return 'cancelled';
  if (normalized.includes('return')) return 'returned';

  return 'placed';
}

/**
 * Extract UTM parameters from an EasyEcom order.
 * UTM data may be in source, additional_info, custom_fields, or marketplace_name.
 */
function extractUtmParams(order: EasyEcomOrder): {
  utmSource: string | null;
  utmCampaign: string | null;
  utmMedium: string | null;
  utmContent: string | null;
} {
  // Check additional_info first
  const info = order.additional_info || {};
  const custom = order.custom_fields || {};

  return {
    utmSource: info.utm_source || custom.utm_source || null,
    utmCampaign: info.utm_campaign || custom.utm_campaign || null,
    utmMedium: info.utm_medium || custom.utm_medium || null,
    utmContent: info.utm_content || custom.utm_content || null,
  };
}

/**
 * Attribute an order to a creator by matching UTM campaign (creator slug)
 * and UTM content (shortCode) to Sitrus records.
 */
async function attributeOrder(utmCampaign: string | null, utmContent: string | null) {
  let creatorId: string | null = null;
  let linkId: string | null = null;

  // Match creator by slug (utm_campaign)
  if (utmCampaign) {
    const profile = await prisma.creatorProfile.findUnique({
      where: { slug: utmCampaign },
      select: { userId: true },
    });
    if (profile) {
      creatorId = profile.userId;
    }
  }

  // Match SitLink by shortCode (utm_content)
  if (utmContent) {
    const link = await prisma.link.findUnique({
      where: { shortCode: utmContent },
      select: { id: true, creatorId: true },
    });
    if (link) {
      linkId = link.id;
      // If we couldn't find creator from campaign, use link's creator
      if (!creatorId) {
        creatorId = link.creatorId;
      }
    }
  }

  return { creatorId, linkId };
}

/**
 * Format a date as a monthly period string (e.g. "2026-04").
 */
function formatPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Sync orders from EasyEcom for a given brand within a date range.
 *
 * @param brandId - The Sitrus brand ID
 * @param from - Start date (ISO string)
 * @param to - End date (ISO string)
 * @returns Sync result summary
 */
export async function syncOrders(
  brandId: string,
  from: string,
  to: string
): Promise<OrderSyncResult> {
  const startTime = Date.now();
  let created = 0;
  let updated = 0;
  let attributed = 0;
  let earningsCreated = 0;
  let errors = 0;

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, commissionRate: true },
  });

  if (!brand) throw new Error(`Brand ${brandId} not found`);

  const client = await createEasyEcomClient(brandId);
  const orders = await client.getOrders(from, to);
  const totalFetched = orders.length;

  for (const eeOrder of orders) {
    try {
      const orderId = String(eeOrder.order_id);
      const status = mapOrderStatus(eeOrder.order_status);
      const utmParams = extractUtmParams(eeOrder);
      const { creatorId, linkId } = await attributeOrder(
        utmParams.utmCampaign,
        utmParams.utmContent
      );

      if (creatorId) attributed++;

      // Calculate order value from items
      const orderValue = eeOrder.total_amount ||
        eeOrder.sub_order_items?.reduce(
          (sum, item) => sum + item.selling_price * item.qty,
          0
        ) || 0;

      // Check if order already exists
      const existing = await prisma.brandOrder.findUnique({
        where: { easyecomOrderId: orderId },
        select: { id: true, status: true },
      });

      if (existing) {
        // Update status if changed
        if (existing.status !== status) {
          await prisma.brandOrder.update({
            where: { easyecomOrderId: orderId },
            data: {
              status,
              fulfilledAt: status === 'delivered' ? new Date() : undefined,
            },
          });
          updated++;
        }
        continue;
      }

      // Create new order
      const brandOrder = await prisma.brandOrder.create({
        data: {
          brandId,
          easyecomOrderId: orderId,
          easyecomInvoiceId: eeOrder.invoice_id || null,
          creatorId,
          linkId,
          utmSource: utmParams.utmSource,
          utmCampaign: utmParams.utmCampaign,
          utmMedium: utmParams.utmMedium,
          utmContent: utmParams.utmContent,
          orderNumber: eeOrder.reference_code || orderId,
          customerName: eeOrder.customer_name || null,
          customerEmail: eeOrder.customer_email || null,
          orderValue,
          status,
          itemCount: eeOrder.sub_order_items?.length || 1,
          orderedAt: new Date(eeOrder.created_at),
          fulfilledAt: status === 'delivered' ? new Date() : null,
          items: {
            create: (eeOrder.sub_order_items || []).map((item) => ({
              easyecomProductId: item.cp_id ? String(item.cp_id) : null,
              sku: item.sku || null,
              productName: item.product_name,
              quantity: item.qty,
              unitPrice: item.selling_price,
              totalPrice: item.selling_price * item.qty,
            })),
          },
        },
      });

      created++;

      // Auto-create earning if attributed to a creator and order is confirmed+
      if (
        creatorId &&
        brand.commissionRate &&
        ['confirmed', 'dispatched', 'delivered'].includes(status)
      ) {
        await prisma.earning.create({
          data: {
            creatorId,
            linkId,
            amount: orderValue * (brand.commissionRate / 100),
            status: 'PENDING',
            period: formatPeriod(new Date(eeOrder.created_at)),
            description: `${brand.id} order #${brandOrder.orderNumber}`,
          },
        });
        earningsCreated++;
      }
    } catch (err) {
      console.error(`[OrderSync] Error processing order ${eeOrder.order_id}:`, err);
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
    earningsCreated,
    errors,
    durationMs: Date.now() - startTime,
  };
}
