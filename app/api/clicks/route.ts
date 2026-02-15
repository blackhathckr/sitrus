/**
 * Click Analytics API Route
 *
 * GET /api/clicks - Query click data with filtering, grouping, and pagination
 *
 * Supports two modes:
 * 1. **Grouped** (when `groupBy` is specified): Returns aggregated counts
 *    grouped by date, country, device, referrer, or browser.
 * 2. **List** (no `groupBy`): Returns a paginated list of individual clicks.
 *
 * Creators are automatically scoped to clicks on their own links.
 * Admins can query across any creator's data.
 *
 * @module api/clicks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { clickQuerySchema } from '@/lib/validations/click';
import { ZodError } from 'zod';
import { Prisma, UserRole } from '@prisma/client';

/**
 * GET /api/clicks
 *
 * Query click analytics data with support for:
 * - Filtering by linkId, creatorId, and date range (dateFrom / dateTo)
 * - Grouping by date, country, device, referrer, or browser
 * - Standard page-based pagination (when not grouped)
 *
 * @param request - Incoming request with query params
 * @returns Grouped analytics data or a paginated list of clicks
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { linkId, creatorId, dateFrom, dateTo, groupBy } =
      clickQuerySchema.parse(queryParams);

    // Determine the effective creator scope
    // Creators are always scoped to their own clicks
    const effectiveCreatorId =
      session.user.role === UserRole.CREATOR
        ? session.user.id
        : creatorId || undefined;

    // Build the base where clause
    const where: Prisma.ClickWhereInput = {};

    if (linkId) {
      where.linkId = linkId;
    }

    // Scope by creator — filter clicks whose link belongs to the creator
    if (effectiveCreatorId) {
      where.link = { creatorId: effectiveCreatorId };
    }

    // Date range filters
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // -------------------------------------------------------------------------
    // GROUPED MODE — Aggregate click counts by a dimension
    // -------------------------------------------------------------------------
    if (groupBy) {
      if (groupBy === 'date') {
        // Group by calendar date using Prisma raw query for DATE() truncation
        // Build dynamic WHERE conditions for the raw query
        const conditions: string[] = ['1=1'];
        const values: (string | Date)[] = [];

        if (linkId) {
          conditions.push(`c."linkId" = $${values.length + 1}`);
          values.push(linkId);
        }
        if (effectiveCreatorId) {
          conditions.push(
            `c."linkId" IN (SELECT id FROM links WHERE "creatorId" = $${values.length + 1})`
          );
          values.push(effectiveCreatorId);
        }
        if (dateFrom) {
          conditions.push(`c."createdAt" >= $${values.length + 1}`);
          values.push(new Date(dateFrom));
        }
        if (dateTo) {
          conditions.push(`c."createdAt" <= $${values.length + 1}`);
          values.push(new Date(dateTo));
        }

        const whereClause = conditions.join(' AND ');

        const results = await prisma.$queryRawUnsafe<
          Array<{ date: string; count: bigint }>
        >(
          `SELECT DATE(c."createdAt") as date, COUNT(*)::bigint as count
           FROM clicks c
           WHERE ${whereClause}
           GROUP BY DATE(c."createdAt")
           ORDER BY date DESC`,
          ...values
        );

        return NextResponse.json({
          data: results.map((row) => ({
            date: row.date,
            count: Number(row.count),
          })),
          groupBy: 'date',
        });
      }

      // For non-date dimensions, use Prisma's built-in groupBy
      const groupByField = groupBy as keyof typeof Prisma.ClickScalarFieldEnum;

      const results = await prisma.click.groupBy({
        by: [groupByField],
        where,
        _count: { _all: true },
        orderBy: { _count: { [groupByField]: 'desc' as const } },
      });

      return NextResponse.json({
        data: results.map((row) => ({
          [groupBy]: row[groupByField],
          count: row._count._all,
        })),
        groupBy,
      });
    }

    // -------------------------------------------------------------------------
    // LIST MODE — Paginated individual clicks
    // -------------------------------------------------------------------------
    const page = Number(searchParams.get('page')) || 1;
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    const [total, clicks] = await Promise.all([
      prisma.click.count({ where }),
      prisma.click.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          link: {
            select: {
              shortCode: true,
              customAlias: true,
              product: {
                select: {
                  title: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      data: clicks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching clicks:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch click analytics' },
      { status: 500 }
    );
  }
}
