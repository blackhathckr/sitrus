/**
 * Payouts API Routes
 *
 * GET  /api/payouts - List payouts (own for creators, all for admins)
 * POST /api/payouts - Creator requests a new payout
 *
 * @module api/payouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { payoutQuerySchema, createPayoutSchema } from '@/lib/validations/payout';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/payouts
 *
 * Returns a paginated list of payouts. Creators see only their own
 * payouts; admins can view all payouts with optional creatorId and
 * status filters. Each payout includes creator name and email.
 *
 * @param request - The incoming HTTP request with query parameters
 * @returns JSON response with paginated payout data
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { creatorId, status, page, limit } =
      payoutQuerySchema.parse(queryParams);

    // Build where clause
    const where: Prisma.PayoutWhereInput = {};

    // Creators can only see their own payouts
    if (session.user.role === 'CREATOR') {
      where.creatorId = session.user.id;
    } else {
      // Admin permission check
      const canRead = hasPermission(session.user, 'payouts', 'read');
      if (!canRead) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (creatorId) {
        where.creatorId = creatorId;
      }
    }

    if (status) {
      where.status = status;
    }

    // Count total matching records
    const total = await prisma.payout.count({ where });

    // Fetch payouts with creator information
    const payouts = await prisma.payout.findMany({
      where,
      select: {
        id: true,
        creatorId: true,
        amount: true,
        currency: true,
        status: true,
        method: true,
        approvedBy: true,
        processedAt: true,
        reference: true,
        createdAt: true,
        updatedAt: true,
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
      data: payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);

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
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payouts
 *
 * Creates a new payout request for the authenticated creator.
 * Validates that the creator has sufficient confirmed earnings
 * (sum of CONFIRMED earnings minus any existing non-rejected payouts)
 * before allowing the request.
 *
 * @param request - The incoming HTTP request with JSON body
 * @returns JSON response with the created payout (201)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only creators can request payouts
    if (session.user.role !== 'CREATOR') {
      return NextResponse.json(
        { error: 'Only creators can request payouts' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { amount } = createPayoutSchema.parse(body);

    // Calculate available confirmed earnings for the creator
    const confirmedEarnings = await prisma.earning.aggregate({
      where: {
        creatorId: session.user.id,
        status: 'CONFIRMED',
      },
      _sum: { amount: true },
    });

    const totalConfirmed = confirmedEarnings._sum.amount ?? 0;

    // Subtract any pending/approved/processing payouts that have not been
    // rejected or completed (to prevent double-requesting)
    const outstandingPayouts = await prisma.payout.aggregate({
      where: {
        creatorId: session.user.id,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
      },
      _sum: { amount: true },
    });

    const totalOutstanding = outstandingPayouts._sum.amount ?? 0;
    const availableBalance = totalConfirmed - totalOutstanding;

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: 'Insufficient confirmed earnings',
          details: {
            requested: amount,
            available: availableBalance,
            totalConfirmed,
            outstandingPayouts: totalOutstanding,
          },
        },
        { status: 400 }
      );
    }

    // Create the payout request
    const payout = await prisma.payout.create({
      data: {
        creatorId: session.user.id,
        amount,
        status: 'PENDING',
      },
      select: {
        id: true,
        creatorId: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    });

    // Audit log (non-blocking)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Payout',
        entityId: payout.id,
        changes: {
          type: 'payout_request',
          amount,
          availableBalance,
        },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        message: 'Payout request created successfully',
        data: payout,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating payout:', error);

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

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Duplicate payout request' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create payout request' },
      { status: 500 }
    );
  }
}
