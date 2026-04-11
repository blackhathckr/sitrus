/**
 * Product Sync Trigger API
 *
 * POST /api/admin/integrations/[brandId]/sync-products
 *
 * Triggers a full product sync from EasyEcom for the given brand.
 * Admin only. This may take a while for large catalogs.
 *
 * @module api/admin/integrations/[brandId]/sync-products
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { syncProducts } from '@/lib/integrations/easyecom/product-sync';

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
    const result = await syncProducts(brandId);

    return NextResponse.json({
      message: 'Product sync completed',
      data: result,
    });
  } catch (error) {
    console.error('[API] POST sync-products error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Product sync failed' },
      { status: 500 }
    );
  }
}
