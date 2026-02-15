/**
 * Admin Analytics API Route
 *
 * GET /api/admin/analytics
 * Returns detailed analytics for the admin dashboard including click
 * trends over time, top creators by clicks, top products by clicks,
 * geographic distribution, and device distribution.
 *
 * Accepts optional `dateFrom` and `dateTo` query parameters for
 * custom date ranges. Defaults to the last 30 days.
 *
 * @module api/admin/analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * GET /api/admin/analytics
 *
 * Admin-only analytics endpoint that provides:
 * - **clicksOverTime**: Daily click counts for the date range
 * - **topCreators**: Top 10 creators ranked by total clicks
 * - **topProducts**: Top 10 products ranked by total clicks
 * - **geoDistribution**: Click counts grouped by country
 * - **deviceDistribution**: Click counts grouped by device type
 *
 * @param request - The incoming HTTP request with optional date filters
 * @returns JSON response with analytics data
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

    // Parse optional date range parameters
    const { searchParams } = new URL(request.url);
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');

    const dateTo = dateToParam ? new Date(dateToParam) : new Date();
    const dateFrom = dateFromParam
      ? new Date(dateFromParam)
      : new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Validate parsed dates
    if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 (e.g. "2026-01-15").' },
        { status: 400 }
      );
    }

    // Set dateTo to end of day for inclusive range
    dateTo.setHours(23, 59, 59, 999);

    // Run all analytics queries in parallel
    const [
      clicksOverTime,
      topCreators,
      topProducts,
      geoDistribution,
      deviceDistribution,
    ] = await Promise.all([
      // Clicks per day using raw SQL for date grouping
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          DATE("createdAt") AS date,
          COUNT(*)::bigint AS count
        FROM clicks
        WHERE "createdAt" >= ${dateFrom}
          AND "createdAt" <= ${dateTo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,

      // Top 10 creators by total clicks
      prisma.$queryRaw<
        Array<{
          creatorId: string;
          name: string;
          email: string;
          totalClicks: bigint;
        }>
      >`
        SELECT
          u.id AS "creatorId",
          u.name,
          u.email,
          COUNT(c.id)::bigint AS "totalClicks"
        FROM clicks c
        JOIN links l ON c."linkId" = l.id
        JOIN users u ON l."creatorId" = u.id
        WHERE c."createdAt" >= ${dateFrom}
          AND c."createdAt" <= ${dateTo}
        GROUP BY u.id, u.name, u.email
        ORDER BY "totalClicks" DESC
        LIMIT 10
      `,

      // Top 10 products by total clicks
      prisma.$queryRaw<
        Array<{
          productId: string;
          title: string;
          totalClicks: bigint;
        }>
      >`
        SELECT
          p.id AS "productId",
          p.title,
          COUNT(c.id)::bigint AS "totalClicks"
        FROM clicks c
        JOIN links l ON c."linkId" = l.id
        JOIN products p ON l."productId" = p.id
        WHERE c."createdAt" >= ${dateFrom}
          AND c."createdAt" <= ${dateTo}
        GROUP BY p.id, p.title
        ORDER BY "totalClicks" DESC
        LIMIT 10
      `,

      // Geographic distribution: clicks by country
      prisma.$queryRaw<Array<{ country: string | null; count: bigint }>>`
        SELECT
          COALESCE(country, 'Unknown') AS country,
          COUNT(*)::bigint AS count
        FROM clicks
        WHERE "createdAt" >= ${dateFrom}
          AND "createdAt" <= ${dateTo}
        GROUP BY country
        ORDER BY count DESC
      `,

      // Device distribution: clicks by device type
      prisma.$queryRaw<Array<{ device: string | null; count: bigint }>>`
        SELECT
          COALESCE(device, 'Unknown') AS device,
          COUNT(*)::bigint AS count
        FROM clicks
        WHERE "createdAt" >= ${dateFrom}
          AND "createdAt" <= ${dateTo}
        GROUP BY device
        ORDER BY count DESC
      `,
    ]);

    // Convert BigInt values to numbers for JSON serialization
    const serializeCount = <T extends Record<string, unknown>>(
      rows: T[],
      countField: string
    ) =>
      rows.map((row) => ({
        ...row,
        [countField]: Number(row[countField]),
      }));

    return NextResponse.json({
      data: {
        dateRange: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString(),
        },
        clicksOverTime: serializeCount(clicksOverTime, 'count'),
        topCreators: serializeCount(topCreators, 'totalClicks'),
        topProducts: serializeCount(topProducts, 'totalClicks'),
        geoDistribution: serializeCount(geoDistribution, 'count'),
        deviceDistribution: serializeCount(deviceDistribution, 'count'),
      },
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);

    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
