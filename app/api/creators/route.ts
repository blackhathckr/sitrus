/**
 * Creators API Routes
 *
 * GET /api/creators - List creator profiles with pagination and filtering.
 *
 * Admin users see all creators with full details (including email).
 * Public/Creator users see only approved and public profiles.
 * Supports search across name, slug, Instagram handle, and display name.
 *
 * @module api/creators
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { creatorQuerySchema } from '@/lib/validations/creator';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/creators
 *
 * List creator profiles with pagination and search.
 *
 * - Admin: sees all creators with user email, approval status filtering.
 * - Public/Creator: sees only approved & public profiles.
 *
 * @param request - Incoming HTTP request with optional query params:
 *   search, isApproved (admin only), page, limit
 * @returns Paginated list of creator profiles
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const isAdmin =
      session?.user && hasPermission(session.user, 'creators', 'delete');

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { search, isApproved, page, limit } =
      creatorQuerySchema.parse(queryParams);

    // Build the where clause for CreatorProfile
    const profileWhere: Prisma.CreatorProfileWhereInput = {};

    // Non-admin users can only see approved and public profiles with active users
    if (!isAdmin) {
      profileWhere.isApproved = true;
      profileWhere.isPublic = true;
      profileWhere.user = { isActive: true };
    } else if (isApproved !== undefined) {
      // Admin can filter by approval status
      profileWhere.isApproved = isApproved;
    }

    // Search across user.name, creatorProfile.slug, instagramHandle, displayName
    if (search) {
      profileWhere.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { slug: { contains: search, mode: 'insensitive' } },
        { instagramHandle: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Count total matching records
    const total = await prisma.creatorProfile.count({ where: profileWhere });

    // Fetch profiles with user data
    const profiles = await prisma.creatorProfile.findMany({
      where: profileWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            // Only include email for admin
            ...(isAdmin && { email: true }),
            ...(isAdmin && { isActive: true }),
            ...(isAdmin && { role: true }),
            ...(isAdmin && { createdAt: true }),
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
      data: profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/creators error:', error);

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
      { error: 'Failed to fetch creators' },
      { status: 500 }
    );
  }
}
