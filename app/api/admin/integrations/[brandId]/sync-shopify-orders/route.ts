/**
 * Shopify Order Sync API
 *
 * POST /api/admin/integrations/[brandId]/sync-shopify-orders
 *
 * Fetches orders from Shopify, attributes them via UTM params from SitLinks.
 *
 * @module api/admin/integrations/[brandId]/sync-shopify-orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { syncShopifyOrders } from '@/lib/integrations/shopify/order-sync';

interface RouteParams {
  params: Promise<{ brandId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'integrations', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { brandId } = await params;
    const result = await syncShopifyOrders(brandId);

    return NextResponse.json({
      message: 'Shopify order sync completed',
      data: result,
    });
  } catch (error) {
    console.error('[API] POST sync-shopify-orders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Shopify order sync failed' },
      { status: 500 }
    );
  }
}
