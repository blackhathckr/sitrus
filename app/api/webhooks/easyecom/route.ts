/**
 * EasyEcom Webhook Receiver
 *
 * POST /api/webhooks/easyecom
 *
 * Receives webhook events from EasyEcom for order creation, order status
 * updates, and inventory changes. Validates the Access-Token header
 * against EASYECOM_WEBHOOK_SECRET env var.
 *
 * Supported events:
 * - create_order / fetch_order — New order created
 * - confirm_order / confirm_order_start — Order confirmed
 * - ready_to_dispatch / manifested — Order ready for shipping
 * - shipped — Order shipped
 * - delivered — Order delivered
 * - cancel_order — Order cancelled
 * - mark_return — Return marked
 * - rto_initiated — Return to origin initiated
 * - update_inventory — Inventory changed
 *
 * @module api/webhooks/easyecom
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Map EasyEcom webhook event to Sitrus order status.
 */
function eventToStatus(event: string): string | null {
  const mapping: Record<string, string> = {
    create_order: 'placed',
    fetch_order: 'placed',
    confirm_order: 'confirmed',
    confirm_order_start: 'confirmed',
    ready_to_dispatch: 'dispatched',
    manifested: 'dispatched',
    shipped: 'dispatched',
    delivered: 'delivered',
    cancel_order: 'cancelled',
    mark_return: 'returned',
    rto_initiated: 'returned',
  };
  return mapping[event] || null;
}

/**
 * Format a date as a monthly period string.
 */
function formatPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function POST(request: NextRequest) {
  try {
    // Validate Access-Token header
    const webhookSecret = process.env.EASYECOM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const accessToken = request.headers.get('Access-Token') || request.headers.get('access-token');
      if (accessToken !== webhookSecret) {
        console.warn('[Webhook] Invalid Access-Token received');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const event = body.event as string;
    const data = body.data;

    if (!event || !data) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    console.log(`[Webhook] EasyEcom event: ${event}, order_id: ${data.order_id}`);

    // Handle inventory update event
    if (event === 'update_inventory') {
      const cpId = String(data.cp_id);
      const availableQty = data.available_inventory ?? 0;

      await prisma.product.updateMany({
        where: { easyecomProductId: cpId },
        data: {
          stockQuantity: availableQty,
          inStock: availableQty > 0,
        },
      });

      return NextResponse.json({ status: 'ok', event: 'inventory_updated' });
    }

    // Handle order events
    const status = eventToStatus(event);
    if (!status || !data.order_id) {
      return NextResponse.json({ status: 'ok', event: 'ignored' });
    }

    const orderId = String(data.order_id);

    // Check if order already exists
    const existing = await prisma.brandOrder.findUnique({
      where: { easyecomOrderId: orderId },
      select: { id: true, status: true, brandId: true },
    });

    if (existing) {
      // Update status if it has changed
      if (existing.status !== status) {
        await prisma.brandOrder.update({
          where: { easyecomOrderId: orderId },
          data: {
            status,
            fulfilledAt: status === 'delivered' ? new Date() : undefined,
          },
        });
      }
      return NextResponse.json({ status: 'ok', event: 'order_updated' });
    }

    // New order — try to find brand by matching products
    const orderItems = data.sub_order_items || [];
    let brandId: string | null = null;

    if (orderItems.length > 0) {
      const cpId = String(orderItems[0].cp_id);
      const matchedProduct = await prisma.product.findFirst({
        where: { easyecomProductId: cpId },
        select: { brandId: true },
      });
      brandId = matchedProduct?.brandId || null;
    }

    // If we still don't have a brandId, try to find by integration
    if (!brandId) {
      const integration = await prisma.brandIntegration.findFirst({
        where: { provider: 'easyecom', syncEnabled: true },
        select: { brandId: true },
      });
      brandId = integration?.brandId || null;
    }

    if (!brandId) {
      console.error(`[Webhook] Could not determine brand for order ${orderId}`);
      return NextResponse.json(
        { error: 'Could not determine brand' },
        { status: 400 }
      );
    }

    // Extract UTM data from order
    const info = data.additional_info || {};
    const custom = data.custom_fields || {};
    const utmSource = info.utm_source || custom.utm_source || null;
    const utmCampaign = info.utm_campaign || custom.utm_campaign || null;
    const utmContent = info.utm_content || custom.utm_content || null;

    // Attribution
    let creatorId: string | null = null;
    let linkId: string | null = null;

    if (utmCampaign) {
      const profile = await prisma.creatorProfile.findUnique({
        where: { slug: utmCampaign },
        select: { userId: true },
      });
      if (profile) creatorId = profile.userId;
    }

    if (utmContent) {
      const link = await prisma.link.findUnique({
        where: { shortCode: utmContent },
        select: { id: true, creatorId: true },
      });
      if (link) {
        linkId = link.id;
        if (!creatorId) creatorId = link.creatorId;
      }
    }

    // Calculate order value
    const orderValue = data.total_amount ||
      orderItems.reduce(
        (sum: number, item: { selling_price: number; qty: number }) =>
          sum + item.selling_price * item.qty,
        0
      ) || 0;

    // Create brand order
    const brandOrder = await prisma.brandOrder.create({
      data: {
        brandId,
        easyecomOrderId: orderId,
        easyecomInvoiceId: data.invoice_id || null,
        creatorId,
        linkId,
        utmSource,
        utmCampaign,
        utmMedium: info.utm_medium || custom.utm_medium || null,
        utmContent,
        orderNumber: data.reference_code || orderId,
        customerName: data.customer_name || null,
        customerEmail: data.customer_email || null,
        orderValue,
        status,
        itemCount: orderItems.length || 1,
        orderedAt: data.created_at ? new Date(data.created_at) : new Date(),
        items: {
          create: orderItems.map((item: {
            cp_id?: number;
            sku?: string;
            product_name: string;
            qty: number;
            selling_price: number;
          }) => ({
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

    // Auto-create earning for attributed confirmed+ orders
    if (creatorId && ['confirmed', 'dispatched', 'delivered'].includes(status)) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { commissionRate: true },
      });

      if (brand?.commissionRate) {
        await prisma.earning.create({
          data: {
            creatorId,
            linkId,
            amount: orderValue * (brand.commissionRate / 100),
            status: 'PENDING',
            period: formatPeriod(new Date(data.created_at || Date.now())),
            description: `Brand order #${brandOrder.orderNumber}`,
          },
        });
      }
    }

    return NextResponse.json({ status: 'ok', event: 'order_created' }, { status: 201 });
  } catch (error) {
    console.error('[Webhook] EasyEcom error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
