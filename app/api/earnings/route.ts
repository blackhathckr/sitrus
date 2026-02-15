/**
 * Earnings API Route
 *
 * GET /api/earnings
 * Returns paginated earnings for the authenticated user. Creators are
 * scoped to their own earnings; admins can filter by any creatorId.
 *
 * @module api/earnings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission, isOwnResource } from '@/lib/auth/permissions';
import { earningQuerySchema, createEarningSchema } from '@/lib/validations/earning';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/earnings
 *
 * Fetches a paginated list of earnings with optional filters for
 * creatorId, period, and status. Each earning includes related link
 * information (shortCode, product title) when available.
 *
 * @param request - The incoming HTTP request with query parameters
 * @returns JSON response with paginated earnings data
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { creatorId, period, status, page, limit } =
      earningQuerySchema.parse(queryParams);

    // Build where clause
    const where: Prisma.EarningWhereInput = {};

    // Creators can only see their own earnings
    if (session.user.role === 'CREATOR') {
      where.creatorId = session.user.id;
    } else if (creatorId) {
      where.creatorId = creatorId;
    }

    if (period) {
      where.period = period;
    }

    if (status) {
      where.status = status;
    }

    // Count total matching records
    const total = await prisma.earning.count({ where });

    // Fetch earnings with link and product information
    const earnings = await prisma.earning.findMany({
      where,
      select: {
        id: true,
        creatorId: true,
        linkId: true,
        amount: true,
        currency: true,
        status: true,
        period: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        link: {
          select: {
            shortCode: true,
            product: {
              select: {
                title: true,
              },
            },
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      data: earnings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);

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
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/earnings
 *
 * Admin-only endpoint to manually create an earning record for a creator.
 * Used when affiliate sales are tracked outside the platform.
 *
 * @param request - The incoming HTTP request with JSON body
 * @returns JSON response with the created earning (201)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = createEarningSchema.parse(body);

    // Default period to current month
    const period =
      data.period ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // Verify creator exists
    const creator = await prisma.user.findUnique({
      where: { id: data.creatorId },
      select: { id: true, role: true },
    });

    if (!creator || creator.role !== 'CREATOR') {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Verify link belongs to creator if provided
    if (data.linkId) {
      const link = await prisma.link.findUnique({
        where: { id: data.linkId },
        select: { creatorId: true },
      });
      if (!link || link.creatorId !== data.creatorId) {
        return NextResponse.json(
          { error: 'Link not found or does not belong to this creator' },
          { status: 400 }
        );
      }
    }

    const earning = await prisma.earning.create({
      data: {
        creatorId: data.creatorId,
        linkId: data.linkId ?? null,
        amount: data.amount,
        status: data.status,
        period,
        description: data.description ?? null,
      },
      select: {
        id: true,
        creatorId: true,
        linkId: true,
        amount: true,
        currency: true,
        status: true,
        period: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: 'Earning created', data: earning },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating earning:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create earning' },
      { status: 500 }
    );
  }
}
