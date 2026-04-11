/**
 * Inventory Sync Trigger API
 *
 * POST /api/admin/integrations/[brandId]/sync-inventory
 *
 * Triggers an inventory sync from EasyEcom for the given brand.
 * Updates stock quantities and in-stock status for all synced products.
 * Admin only.
 *
 * @module api/admin/integrations/[brandId]/sync-inventory
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { syncInventory } from '@/lib/integrations/easyecom/inventory-sync';

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
    const result = await syncInventory(brandId);

    return NextResponse.json({
      message: 'Inventory sync completed',
      data: result,
    });
  } catch (error) {
    console.error('[API] POST sync-inventory error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Inventory sync failed' },
      { status: 500 }
    );
  }
}
