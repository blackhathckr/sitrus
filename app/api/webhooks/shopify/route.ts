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
import type { ShopifyOrder } from '@/lib/integrations/shopify/types';

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
 * Extract UTM params from Shopify order's landing_site URL.
 */
function extractUtmFromLandingSite(landingSite: string | null): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
} {
  if (!landingSite) return { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null };

  try {
    const url = new URL(landingSite, 'https://placeholder.com');
    return {
      utmSource: url.searchParams.get('utm_source'),
      utmMedium: url.searchParams.get('utm_medium'),
      utmCampaign: url.searchParams.get('utm_campaign'),
      utmContent: url.searchParams.get('utm_content'),
    };
  } catch {
    return { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null };
  }
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
    const order: ShopifyOrder = JSON.parse(rawBody);

    console.log(`[Shopify Webhook] ${topic} for order ${order.name} from ${shopDomain}`);

    // Only process order events
    if (!topic?.startsWith('orders/')) {
      return NextResponse.json({ status: 'ok', event: 'ignored' });
    }

    const utm = extractUtmFromLandingSite(order.landing_site);

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
      select: { id: true, status: true, creatorId: true, orderNumber: true },
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
            let newEarningStatus: EarningStatus | null = null;
            if (status === 'delivered' && earning.status === EarningStatus.PENDING) newEarningStatus = EarningStatus.CONFIRMED;
            if (status === 'cancelled' && earning.status !== EarningStatus.PAID) newEarningStatus = EarningStatus.CANCELLED;

            if (newEarningStatus) {
              await prisma.earning.update({
                where: { id: earning.id },
                data: { status: newEarningStatus },
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
