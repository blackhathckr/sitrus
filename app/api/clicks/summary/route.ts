/**
 * Click Summary API Route
 *
 * GET /api/clicks/summary - Aggregated click statistics for a creator
 *
 * Returns high-level click metrics:
 * - Total clicks across all links
 * - Unique visitors (distinct hashed IPs)
 * - Clicks today, this week, and this month
 *
 * Creators are automatically scoped to their own data.
 * Admins can optionally filter by a specific creatorId.
 *
 * @module api/clicks/summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { Prisma, UserRole } from '@prisma/client';

/**
 * GET /api/clicks/summary
 *
 * Compute and return aggregated click summary statistics.
 * All metrics are scoped to the authenticated creator's links,
 * unless the user is an admin who specifies a creatorId query param.
 *
 * Response shape:
 * ```json
 * {
 *   "totalClicks": 1234,
 *   "uniqueClicks": 987,
 *   "clicksToday": 42,
 *   "clicksThisWeek": 210,
 *   "clicksThisMonth": 890
 * }
 * ```
 *
 * @param request - Incoming request, optional ?creatorId= for admins
 * @returns Click summary metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check
    const canRead = hasPermission(session.user, 'clicks', 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine effective creator scope
    const { searchParams } = new URL(request.url);
    const queryCreatorId = searchParams.get('creatorId');

    let effectiveCreatorId: string | undefined;

    if (session.user.role === UserRole.CREATOR) {
      // Creators are always scoped to their own data
      effectiveCreatorId = session.user.id;
    } else if (queryCreatorId) {
      // Admins can filter by a specific creator
      effectiveCreatorId = queryCreatorId;
    }
    // If admin with no creatorId filter, effectiveCreatorId remains undefined
    // and all clicks across the platform are summarized

    // Build the base where clause — scope clicks to the creator's links
    const where: Prisma.ClickWhereInput = {};
    if (effectiveCreatorId) {
      where.link = { creatorId: effectiveCreatorId };
    }

    // Compute date boundaries
    const now = new Date();

    // Start of today (midnight in UTC)
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Start of this week (Monday 00:00 UTC)
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getUTCDay();
    // getUTCDay() returns 0 for Sunday, adjust so Monday = 0
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - diffToMonday);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    // Start of this month (1st day 00:00 UTC)
    const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

    // Build time-scoped where clauses
    const todayWhere: Prisma.ClickWhereInput = {
      ...where,
      createdAt: { gte: startOfDay },
    };

    const weekWhere: Prisma.ClickWhereInput = {
      ...where,
      createdAt: { gte: startOfWeek },
    };

    const monthWhere: Prisma.ClickWhereInput = {
      ...where,
      createdAt: { gte: startOfMonth },
    };

    // Execute all counts in parallel for performance
    const [totalClicks, clicksToday, clicksThisWeek, clicksThisMonth] =
      await Promise.all([
        prisma.click.count({ where }),
        prisma.click.count({ where: todayWhere }),
        prisma.click.count({ where: weekWhere }),
        prisma.click.count({ where: monthWhere }),
      ]);

    // Count unique visitors using distinct ipHash
    // Prisma does not support countDistinct directly, so use a raw query
    let uniqueClicks: number;

    if (effectiveCreatorId) {
      const result = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT c."ipHash")::bigint as count
        FROM clicks c
        INNER JOIN links l ON c."linkId" = l.id
        WHERE l."creatorId" = ${effectiveCreatorId}
          AND c."ipHash" IS NOT NULL
      `;
      uniqueClicks = Number(result[0].count);
    } else {
      const result = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "ipHash")::bigint as count
        FROM clicks
        WHERE "ipHash" IS NOT NULL
      `;
      uniqueClicks = Number(result[0].count);
    }

    return NextResponse.json({
      totalClicks,
      uniqueClicks,
      clicksToday,
      clicksThisWeek,
      clicksThisMonth,
    });
  } catch (error) {
    console.error('Error fetching click summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch click summary' },
      { status: 500 }
    );
  }
}
