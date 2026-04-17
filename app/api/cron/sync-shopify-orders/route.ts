/**
 * Cron: Shopify Order Sync
 *
 * GET /api/cron/sync-shopify-orders
 *
 * Called by VM cron job every 30 minutes to sync Shopify orders
 * for all brands with Shopify credentials. Secured by CRON_SECRET.
 *
 * @module api/cron/sync-shopify-orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { syncShopifyOrders } from '@/lib/integrations/shopify/order-sync';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const secret = request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all brands with Shopify credentials and sync enabled
    const integrations = await prisma.brandIntegration.findMany({
      where: {
        shopifyDomain: { not: null },
        shopifyClientId: { not: null },
        syncEnabled: true,
      },
      select: { brandId: true, shopifyDomain: true },
    });

    const results = [];

    for (const integration of integrations) {
      try {
        const result = await syncShopifyOrders(integration.brandId);
        results.push({
          brandId: integration.brandId,
          domain: integration.shopifyDomain,
          ...result,
        });
        console.log(
          `[Cron] Shopify sync for ${integration.shopifyDomain}: ` +
          `${result.created} created, ${result.updated} updated, ${result.attributed} attributed`
        );
      } catch (err) {
        console.error(`[Cron] Shopify sync failed for ${integration.shopifyDomain}:`, err);
        results.push({
          brandId: integration.brandId,
          domain: integration.shopifyDomain,
          error: err instanceof Error ? err.message : 'Sync failed',
        });
      }
    }

    return NextResponse.json({
      message: `Synced ${integrations.length} brand(s)`,
      results,
    });
  } catch (error) {
    console.error('[Cron] sync-shopify-orders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron sync failed' },
      { status: 500 }
    );
  }
}
