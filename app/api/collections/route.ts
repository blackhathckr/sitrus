/**
 * Collections API Routes
 *
 * GET  /api/collections - List collections (creator: own, admin: all or filtered).
 * POST /api/collections - Create a new collection (creator only).
 *
 * Collections allow creators to organize curated products into themed
 * groups displayed on their storefront (e.g., "Summer Essentials",
 * "Tech Picks").
 *
 * @module api/collections
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { createCollectionSchema } from '@/lib/validations/collection';
import { ZodError } from 'zod';
import { Prisma, UserRole } from '@prisma/client';

/**
 * GET /api/collections
 *
 * List collections with product counts, ordered by the `order` field.
 *
 * - Creator: sees only their own collections.
 * - Admin: sees all collections, optionally filtered by creatorId query param.
 *
 * @param request - Incoming HTTP request with optional query param `creatorId`
 * @returns List of collections with _count of products
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - must be able to read collections
    if (!hasPermission(session.user, 'collections', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const isAdmin = session.user.role === UserRole.ADMIN;

    // Build where clause
    const where: Prisma.CollectionWhereInput = {};

    if (isAdmin) {
      // Admin can optionally filter by creatorId
      const creatorId = searchParams.get('creatorId');
      if (creatorId) {
        where.creatorId = creatorId;
      }
    } else {
      // Creators can only see their own collections
      where.creatorId = session.user.id;
    }

    const collections = await prisma.collection.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
        ...(isAdmin && {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        }),
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ data: collections });
  } catch (error) {
    console.error('[API] GET /api/collections error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections
 *
 * Create a new product collection. The creatorId is automatically
 * set to the authenticated user's ID.
 *
 * Validates:
 * - Request body against createCollectionSchema
 * - Slug uniqueness within the creator's own collections
 *   (enforced by @@unique([creatorId, slug]) in Prisma schema)
 *
 * The `order` field is automatically set to max(order) + 1 among
 * the creator's existing collections.
 *
 * @param request - Incoming HTTP request with JSON body:
 *   name, slug, description?, coverImage?, isPublic?
 * @returns The newly created collection
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - must be able to create collections
    if (!hasPermission(session.user, 'collections', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCollectionSchema.parse(body);

    // Enforce max 10 collections per creator
    const collectionCount = await prisma.collection.count({
      where: { creatorId: session.user.id },
    });
    if (collectionCount >= 10) {
      return NextResponse.json(
        { error: 'You can have a maximum of 10 collections' },
        { status: 400 }
      );
    }

    // Check slug uniqueness within creator's collections
    const existingCollection = await prisma.collection.findUnique({
      where: {
        creatorId_slug: {
          creatorId: session.user.id,
          slug: validatedData.slug,
        },
      },
    });

    if (existingCollection) {
      return NextResponse.json(
        { error: 'You already have a collection with this slug' },
        { status: 409 }
      );
    }

    // Determine the next order value (max + 1)
    const maxOrderResult = await prisma.collection.aggregate({
      where: { creatorId: session.user.id },
      _max: { order: true },
    });
    const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

    // Create the collection
    const collection = await prisma.collection.create({
      data: {
        creatorId: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        slug: validatedData.slug,
        coverImage: validatedData.coverImage,
        isPublic: validatedData.isPublic,
        order: nextOrder,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Audit log (non-blocking)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Collection',
        entityId: collection.id,
        changes: {
          name: collection.name,
          slug: collection.slug,
        },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({ data: collection }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/collections error:', error);

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
          { error: 'You already have a collection with this slug' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
