/**
 * Brand Analytics API
 *
 * GET /api/admin/analytics/brands - Brand-level analytics overview
 *
 * Returns GMV, order counts, commission totals, top creators, and
 * inventory health across all integrated brands.
 *
 * @module api/admin/analytics/brands
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'analytics', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all brands with integrations
    const brands = await prisma.brand.findMany({
      where: {
        integration: { isNot: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        commissionRate: true,
        websiteUrl: true,
      },
    });

    // Aggregate order data per brand
    const brandAnalytics = await Promise.all(
      brands.map(async (brand) => {
        const [orderStats, productStats, topCreators] = await Promise.all([
          // Order aggregation — exclude cancelled orders from GMV
          prisma.brandOrder.aggregate({
            where: {
              brandId: brand.id,
              status: { not: 'cancelled' },
            },
            _sum: { orderValue: true },
            _count: true,
          }),

          // Product stats
          prisma.product.groupBy({
            by: ['inStock'],
            where: { brandId: brand.id, isActive: true },
            _count: true,
          }),

          // Top creators by GMV
          prisma.brandOrder.groupBy({
            by: ['creatorId'],
            where: {
              brandId: brand.id,
              creatorId: { not: null },
              status: { not: 'cancelled' },
            },
            _sum: { orderValue: true },
            _count: true,
            orderBy: { _sum: { orderValue: 'desc' } },
            take: 10,
          }),
        ]);

        // Resolve creator names
        const creatorIds = topCreators
          .map((c) => c.creatorId)
          .filter((id): id is string => id !== null);

        const creators = creatorIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: creatorIds } },
              select: { id: true, name: true },
            })
          : [];

        const creatorMap = new Map(creators.map((c) => [c.id, c.name]));

        const inStockCount = productStats.find((p) => p.inStock)?._count || 0;
        const outOfStockCount = productStats.find((p) => !p.inStock)?._count || 0;
        const totalProducts = inStockCount + outOfStockCount;

        const gmv = orderStats._sum.orderValue || 0;
        const commission = brand.commissionRate
          ? gmv * (brand.commissionRate / 100)
          : 0;

        return {
          brand: {
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            logoUrl: brand.logoUrl,
            commissionRate: brand.commissionRate,
          },
          gmv,
          orders: orderStats._count,
          commission,
          inventory: {
            total: totalProducts,
            inStock: inStockCount,
            outOfStock: outOfStockCount,
          },
          topCreators: topCreators.map((c) => ({
            creatorId: c.creatorId,
            name: creatorMap.get(c.creatorId!) || 'Unknown',
            gmv: c._sum.orderValue || 0,
            orders: c._count,
          })),
        };
      })
    );

    // Aggregate totals
    const totalGMV = brandAnalytics.reduce((sum, b) => sum + b.gmv, 0);
    const totalOrders = brandAnalytics.reduce((sum, b) => sum + b.orders, 0);
    const totalCommission = brandAnalytics.reduce((sum, b) => sum + b.commission, 0);

    return NextResponse.json({
      data: {
        totalGMV,
        totalOrders,
        totalCommission,
        brands: brandAnalytics,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/admin/analytics/brands error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand analytics' },
      { status: 500 }
    );
  }
}
