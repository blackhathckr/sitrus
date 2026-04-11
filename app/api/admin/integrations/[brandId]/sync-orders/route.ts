/**
 * Order Sync Trigger API
 *
 * POST /api/admin/integrations/[brandId]/sync-orders
 *
 * Triggers an order sync from EasyEcom for the given brand.
 * Accepts optional date range (defaults to last 30 days).
 * Admin only.
 *
 * @module api/admin/integrations/[brandId]/sync-orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { syncOrders } from '@/lib/integrations/easyecom/order-sync';

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

    // Parse optional date range from body
    let from: string;
    let to: string;

    try {
      const body = await request.json();
      from = body.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      to = body.to || new Date().toISOString();
    } catch {
      // No body provided — default to last 30 days
      from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      to = new Date().toISOString();
    }

    const result = await syncOrders(brandId, from, to);

    return NextResponse.json({
      message: 'Order sync completed',
      data: result,
    });
  } catch (error) {
    console.error('[API] POST sync-orders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Order sync failed' },
      { status: 500 }
    );
  }
}
