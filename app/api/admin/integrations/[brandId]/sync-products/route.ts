/**
 * Product Sync Trigger API
 *
 * POST /api/admin/integrations/[brandId]/sync-products
 *
 * Triggers a full product sync from EasyEcom for the given brand,
 * then syncs from Shopify to fill in any products missing from EasyEcom.
 * Admin only. This may take a while for large catalogs.
 *
 * @module api/admin/integrations/[brandId]/sync-products
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { syncProducts } from '@/lib/integrations/easyecom/product-sync';
import { syncShopifyProducts } from '@/lib/integrations/shopify/product-sync';
import { prisma } from '@/lib/db/prisma';

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

    // Step 1: Sync from EasyEcom (primary source)
    const easyecomResult = await syncProducts(brandId);

    // Step 2: Sync from Shopify (fills gaps — products not in EasyEcom)
    let shopifyResult = null;
    const integration = await prisma.brandIntegration.findUnique({
      where: { brandId },
      select: { shopifyDomain: true, shopifyTokenEnc: true },
    });

    if (integration?.shopifyDomain && integration?.shopifyTokenEnc) {
      try {
        shopifyResult = await syncShopifyProducts(brandId);
      } catch (err) {
        console.error('[API] Shopify product sync error (non-fatal):', err);
        shopifyResult = { error: err instanceof Error ? err.message : 'Shopify sync failed' };
      }
    }

    return NextResponse.json({
      message: 'Product sync completed',
      data: {
        easyecom: easyecomResult,
        shopify: shopifyResult,
      },
    });
  } catch (error) {
    console.error('[API] POST sync-products error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Product sync failed' },
      { status: 500 }
    );
  }
}
