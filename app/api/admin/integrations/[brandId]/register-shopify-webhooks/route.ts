/**
 * Shopify Webhook Registration API
 *
 * POST /api/admin/integrations/[brandId]/register-shopify-webhooks
 *
 * Programmatically registers Shopify webhooks for order events.
 *
 * @module api/admin/integrations/[brandId]/register-shopify-webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { createShopifyClient } from '@/lib/integrations/shopify/client';

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
    const client = await createShopifyClient(brandId);

    // Use the app's public URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.sitrus.club';
    const result = await client.registerWebhooks(baseUrl);

    return NextResponse.json({
      message: 'Shopify webhooks registered',
      data: result,
    });
  } catch (error) {
    console.error('[API] POST register-shopify-webhooks error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook registration failed' },
      { status: 500 }
    );
  }
}
