/**
 * User Search API
 *
 * GET /api/users/search - Search for users by name or email.
 * Used for admin user lookups and autocomplete.
 *
 * @module api/users/search
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/users/search
 *
 * Searches for users by name or email. Requires authentication.
 * Returns matching active users with basic profile info.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const excludeCurrentUser = searchParams.get('excludeCurrent') === 'true';

    const where = {
      isActive: true,
      ...(excludeCurrentUser && { id: { not: session.user.id } }),
      ...(query.length >= 1 && {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
        ],
      }),
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        creatorProfile: {
          select: {
            slug: true,
            displayName: true,
          },
        },
      },
      orderBy: query.length >= 1 ? { name: 'asc' } : { lastLogin: 'desc' },
      take: Math.min(limit, 50),
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[API] GET /api/users/search error:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
