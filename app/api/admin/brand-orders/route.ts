/**
 * Brand Orders API
 *
 * GET /api/admin/brand-orders - List all brand orders with filtering and pagination
 *
 * Admin-only endpoint for viewing orders tracked from external brands
 * via EasyEcom integration.
 *
 * @module api/admin/brand-orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'brand_orders', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId') || undefined;
    const creatorId = searchParams.get('creatorId') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: Prisma.BrandOrderWhereInput = {};

    if (brandId) where.brandId = brandId;
    if (creatorId) where.creatorId = creatorId;
    if (status) where.status = status;

    const [total, orders] = await Promise.all([
      prisma.brandOrder.count({ where }),
      prisma.brandOrder.findMany({
        where,
        orderBy: { orderedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          brand: { select: { id: true, name: true, logoUrl: true } },
          creator: { select: { id: true, name: true, email: true } },
          link: { select: { id: true, shortCode: true } },
          items: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/admin/brand-orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand orders' },
      { status: 500 }
    );
  }
}
