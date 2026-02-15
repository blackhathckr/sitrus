/**
 * Earnings Summary API Route
 *
 * GET /api/earnings/summary
 * Returns an aggregated earnings summary for a creator, broken down
 * by status (pending, confirmed, paid, cancelled). Also includes
 * overall totals and current-period earnings.
 *
 * @module api/earnings/summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * GET /api/earnings/summary
 *
 * Aggregates earning amounts by status for the authenticated creator.
 * Admins may pass a `creatorId` query parameter to view any creator's
 * summary. Creators are always scoped to their own data.
 *
 * Response shape:
 * - pending: total amount of PENDING earnings
 * - confirmed: total amount of CONFIRMED earnings
 * - paid: total amount of PAID earnings
 * - cancelled: total amount of CANCELLED earnings
 * - overallTotal: confirmed + paid
 * - currentPeriod: earnings in the current month (e.g. "2026-02")
 *
 * @param request - The incoming HTTP request
 * @returns JSON response with earnings summary
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    const canRead = hasPermission(session.user, 'earnings', 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine which creator to summarize
    let targetCreatorId: string;

    if (session.user.role === 'CREATOR') {
      // Creators are always scoped to their own earnings
      targetCreatorId = session.user.id;
    } else {
      // Admin can specify a creatorId or see their own
      const { searchParams } = new URL(request.url);
      targetCreatorId = searchParams.get('creatorId') || session.user.id;
    }

    // Aggregate earnings by status
    const statusAggregations = await prisma.earning.groupBy({
      by: ['status'],
      where: { creatorId: targetCreatorId },
      _sum: { amount: true },
    });

    // Build a lookup map from the aggregation results
    const amountByStatus: Record<string, number> = {};
    for (const group of statusAggregations) {
      amountByStatus[group.status] = group._sum.amount ?? 0;
    }

    const pending = amountByStatus['PENDING'] ?? 0;
    const confirmed = amountByStatus['CONFIRMED'] ?? 0;
    const paid = amountByStatus['PAID'] ?? 0;
    const cancelled = amountByStatus['CANCELLED'] ?? 0;
    const overallTotal = confirmed + paid;

    // Current period: YYYY-MM format for the current month
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Aggregate current-period earnings and outstanding payouts in parallel
    const [currentPeriodResult, outstandingPayoutsResult] = await Promise.all([
      prisma.earning.aggregate({
        where: {
          creatorId: targetCreatorId,
          period: currentPeriod,
          status: { not: 'CANCELLED' },
        },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: {
          creatorId: targetCreatorId,
          status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentPeriodEarnings = currentPeriodResult._sum.amount ?? 0;
    const outstandingPayouts = outstandingPayoutsResult._sum.amount ?? 0;
    const availableForPayout = Math.max(0, confirmed - outstandingPayouts);

    return NextResponse.json({
      data: {
        creatorId: targetCreatorId,
        pending,
        confirmed,
        paid,
        cancelled,
        overallTotal,
        outstandingPayouts,
        availableForPayout,
        currentPeriod: {
          period: currentPeriod,
          amount: currentPeriodEarnings,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching earnings summary:', error);

    return NextResponse.json(
      { error: 'Failed to fetch earnings summary' },
      { status: 500 }
    );
  }
}
