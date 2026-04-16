/**
 * Shopify URL Mapping API
 *
 * POST /api/admin/integrations/[brandId]/map-shopify-urls
 *
 * Matches Shopify products by SKU to EasyEcom-synced products and
 * updates sourceUrl to the actual Shopify product page URL.
 *
 * @module api/admin/integrations/[brandId]/map-shopify-urls
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { mapShopifyUrls } from '@/lib/integrations/shopify/url-mapping';

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
    const result = await mapShopifyUrls(brandId);

    return NextResponse.json({
      message: 'URL mapping completed',
      data: result,
    });
  } catch (error) {
    console.error('[API] POST map-shopify-urls error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'URL mapping failed' },
      { status: 500 }
    );
  }
}
