/**
 * Payout Detail API Routes
 *
 * GET /api/payouts/[id] - Get payout details
 * PUT /api/payouts/[id] - Approve or reject a payout (admin only)
 *
 * @module api/payouts/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission, isOwnResource } from '@/lib/auth/permissions';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';

/** Route params shape for Next.js 15 dynamic segments */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Schema for the PUT request body when approving or rejecting a payout.
 * Validates the action and optional reference string.
 */
const payoutActionSchema = z.object({
  /** The admin action to perform on the payout */
  action: z.enum(['approve', 'reject'], {
    required_error: 'Action is required',
    invalid_type_error: 'Action must be "approve" or "reject"',
  }),
  /** Optional transaction reference (only relevant for approvals) */
  reference: z.string().trim().optional(),
});

/**
 * GET /api/payouts/[id]
 *
 * Returns the details of a specific payout. Creators can view their
 * own payouts; admins can view any payout. Includes creator info
 * and related earnings context.
 *
 * @param request - The incoming HTTP request
 * @param params  - Route parameters containing the payout ID
 * @returns JSON response with payout details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the payout
    const payout = await prisma.payout.findUnique({
      where: { id },
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
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    // Authorization: creators can only view their own payouts
    if (session.user.role === 'CREATOR') {
      if (!isOwnResource(session.user.id, payout.creatorId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      const canRead = hasPermission(session.user, 'payouts', 'read');
      if (!canRead) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ data: payout });
  } catch (error) {
    console.error('Error fetching payout:', error);

    return NextResponse.json(
      { error: 'Failed to fetch payout' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/payouts/[id]
 *
 * Admin-only endpoint to approve or reject a payout request.
 *
 * - **approve**: Sets status to APPROVED, records approvedBy and
 *   processedAt, and optionally stores a transaction reference.
 * - **reject**: Sets status to REJECTED and records approvedBy
 *   (the admin who rejected it).
 *
 * Only payouts in PENDING status can be acted upon.
 *
 * @param request - The incoming HTTP request with JSON body
 * @param params  - Route parameters containing the payout ID
 * @returns JSON response with the updated payout
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only permission check
    const canUpdate = hasPermission(session.user, 'payouts', 'update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the existing payout
    const existingPayout = await prisma.payout.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        amount: true,
        status: true,
      },
    });

    if (!existingPayout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    // Only PENDING payouts can be approved or rejected
    if (existingPayout.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: `Cannot modify a payout with status "${existingPayout.status}". Only PENDING payouts can be approved or rejected.`,
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { action, reference } = payoutActionSchema.parse(body);

    let updatedPayout;

    if (action === 'approve') {
      updatedPayout = await prisma.payout.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: session.user.id,
          processedAt: new Date(),
          ...(reference ? { reference } : {}),
        },
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
        },
      });

      // Audit log (non-blocking — don't fail the payout action)
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PAYOUT_APPROVE',
          entityType: 'Payout',
          entityId: id,
          changes: {
            payoutId: id,
            creatorId: existingPayout.creatorId,
            amount: existingPayout.amount,
            reference: reference ?? null,
            previousStatus: existingPayout.status,
            newStatus: 'APPROVED',
          },
        },
      }).catch((err) => console.error('Audit log error:', err));
    } else {
      // action === 'reject'
      updatedPayout = await prisma.payout.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedBy: session.user.id,
        },
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
        },
      });

      // Audit log (non-blocking)
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PAYOUT_REJECT',
          entityType: 'Payout',
          entityId: id,
          changes: {
            payoutId: id,
            creatorId: existingPayout.creatorId,
            amount: existingPayout.amount,
            previousStatus: existingPayout.status,
            newStatus: 'REJECTED',
          },
        },
      }).catch((err) => console.error('Audit log error:', err));
    }

    return NextResponse.json({
      message: `Payout ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: updatedPayout,
    });
  } catch (error) {
    console.error('Error updating payout:', error);

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
          { error: 'Conflict while updating payout' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update payout' },
      { status: 500 }
    );
  }
}
