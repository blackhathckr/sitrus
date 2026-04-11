/**
 * Admin Overview API Route
 *
 * GET /api/admin/overview
 * Returns platform-wide overview statistics for the admin dashboard.
 * Includes creator counts, product/link/click totals, earnings
 * breakdowns, pending payout summaries, and new creator registrations.
 *
 * @module api/admin/overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * GET /api/admin/overview
 *
 * Admin-only endpoint that aggregates key platform metrics:
 * - Total and active creator counts
 * - Total active products, links, and clicks
 * - Earnings aggregated by status
 * - Pending payout count and total amount
 * - New creators registered in the current month
 *
 * @param request - The incoming HTTP request
 * @returns JSON response with platform overview statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only permission check
    const canRead = hasPermission(session.user, 'analytics', 'read');
    if (!canRead || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run all aggregation queries in parallel for performance
    const [
      totalCreators,
      activeCreators,
      totalProducts,
      totalLinks,
      totalClicks,
      earningsByStatus,
      pendingPayouts,
      newCreatorsThisMonth,
      brandOrderStats,
    ] = await Promise.all([
      // Total creators (users with role CREATOR)
      prisma.user.count({
        where: { role: 'CREATOR' },
      }),

      // Active creators (active users with role CREATOR)
      prisma.user.count({
        where: { role: 'CREATOR', isActive: true },
      }),

      // Total active products
      prisma.product.count({
        where: { isActive: true },
      }),

      // Total links
      prisma.link.count(),

      // Total clicks
      prisma.click.count(),

      // Earnings aggregated by status
      prisma.earning.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Pending payouts: count and total amount
      prisma.payout.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // New creators this month
      (() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return prisma.user.count({
          where: {
            role: 'CREATOR',
            createdAt: { gte: startOfMonth },
          },
        });
      })(),

      // Brand GMV (total order value from brand integrations, excluding cancelled)
      prisma.brandOrder.aggregate({
        where: { status: { not: 'cancelled' } },
        _sum: { orderValue: true },
        _count: { id: true },
      }),
    ]);

    // Transform earnings by status into a structured object
    const earnings: Record<string, { count: number; amount: number }> = {};
    for (const group of earningsByStatus) {
      earnings[group.status] = {
        count: group._count.id,
        amount: group._sum.amount ?? 0,
      };
    }

    return NextResponse.json({
      data: {
        creators: {
          total: totalCreators,
          active: activeCreators,
        },
        products: {
          total: totalProducts,
        },
        links: {
          total: totalLinks,
        },
        clicks: {
          total: totalClicks,
        },
        earnings: {
          pending: earnings['PENDING'] ?? { count: 0, amount: 0 },
          confirmed: earnings['CONFIRMED'] ?? { count: 0, amount: 0 },
          paid: earnings['PAID'] ?? { count: 0, amount: 0 },
          cancelled: earnings['CANCELLED'] ?? { count: 0, amount: 0 },
        },
        payouts: {
          pendingCount: pendingPayouts._count.id,
          pendingAmount: pendingPayouts._sum.amount ?? 0,
        },
        newCreatorsThisMonth,
        brandOrders: {
          totalGMV: brandOrderStats._sum.orderValue ?? 0,
          totalOrders: brandOrderStats._count.id,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin overview:', error);

    return NextResponse.json(
      { error: 'Failed to fetch platform overview' },
      { status: 500 }
    );
  }
}
