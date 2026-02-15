/**
 * Collection Detail API Routes
 *
 * GET    /api/collections/[id] - Get a collection with its products.
 * PUT    /api/collections/[id] - Update a collection's metadata.
 * DELETE /api/collections/[id] - Delete a collection (cascades to CollectionProduct).
 *
 * Creators can only access their own collections. Admins can access any.
 *
 * @module api/collections/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission, isOwnResource } from '@/lib/auth/permissions';
import { updateCollectionSchema } from '@/lib/validations/collection';
import { ZodError } from 'zod';
import { Prisma, UserRole } from '@prisma/client';

/** Route parameters containing the collection ID. */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/collections/[id]
 *
 * Retrieve a single collection by ID, including its products with
 * full product details, ordered by CollectionProduct.order.
 *
 * Access rules:
 * - Creator: can only view their own collections.
 * - Admin: can view any collection.
 *
 * @param request - Incoming HTTP request
 * @param params  - Route params containing the collection ID
 * @returns Collection with products
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - must be able to read collections
    if (!hasPermission(session.user, 'collections', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the collection
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
          orderBy: { order: 'asc' },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Ownership check: creators can only see their own collections
    const isAdmin = session.user.role === UserRole.ADMIN;
    if (!isAdmin && !isOwnResource(session.user.id, collection.creatorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: collection });
  } catch (error) {
    console.error('[API] GET /api/collections/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/collections/[id]
 *
 * Update a collection's metadata (name, description, slug,
 * coverImage, isPublic). Validates with updateCollectionSchema.
 *
 * If the slug is being changed, uniqueness is verified within
 * the creator's own collections before proceeding.
 *
 * Access rules:
 * - Creator: can update their own collections only.
 * - Admin: can update any collection.
 *
 * @param request - Incoming HTTP request with JSON body
 * @param params  - Route params containing the collection ID
 * @returns Updated collection data
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - must be able to update collections
    if (!hasPermission(session.user, 'collections', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the existing collection
    const existingCollection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true, creatorId: true, slug: true },
    });

    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Ownership check: creators can only update their own collections
    const isAdmin = session.user.role === UserRole.ADMIN;
    if (
      !isAdmin &&
      !isOwnResource(session.user.id, existingCollection.creatorId)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateCollectionSchema.parse(body);

    // If slug is being changed, check uniqueness within creator
    if (validatedData.slug && validatedData.slug !== existingCollection.slug) {
      const slugExists = await prisma.collection.findUnique({
        where: {
          creatorId_slug: {
            creatorId: existingCollection.creatorId,
            slug: validatedData.slug,
          },
        },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: 'A collection with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update the collection
    const updatedCollection = await prisma.collection.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'Collection',
        entityId: id,
        changes: {
          updatedFields: Object.keys(validatedData),
        },
      },
    });

    return NextResponse.json({ data: updatedCollection });
  } catch (error) {
    console.error('[API] PUT /api/collections/[id] error:', error);

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
          { error: 'A collection with this slug already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/[id]
 *
 * Hard delete a collection and all associated CollectionProduct entries
 * (cascaded by Prisma schema onDelete: Cascade).
 *
 * Access rules:
 * - Creator: can delete their own collections only.
 * - Admin: can delete any collection.
 *
 * @param request - Incoming HTTP request
 * @param params  - Route params containing the collection ID
 * @returns Confirmation message
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - must be able to delete collections
    if (!hasPermission(session.user, 'collections', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the existing collection
    const existingCollection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true, creatorId: true, name: true, slug: true },
    });

    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Ownership check: creators can only delete their own collections
    const isAdmin = session.user.role === UserRole.ADMIN;
    if (
      !isAdmin &&
      !isOwnResource(session.user.id, existingCollection.creatorId)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Hard delete (CollectionProduct entries cascade automatically)
    await prisma.collection.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'Collection',
        entityId: id,
        changes: {
          deletedCollection: {
            name: existingCollection.name,
            slug: existingCollection.slug,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Collection deleted successfully',
    });
  } catch (error) {
    console.error('[API] DELETE /api/collections/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
