/**
 * Collection Products API Routes
 *
 * GET    /api/collections/[id]/products - List products in a collection.
 * POST   /api/collections/[id]/products - Add a product to a collection.
 * DELETE /api/collections/[id]/products - Remove a product from a collection.
 *
 * Public collections (isPublic=true) allow unauthenticated GET access.
 * Modifications require authentication and ownership or admin access.
 *
 * @module api/collections/[id]/products
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission, isOwnResource } from '@/lib/auth/permissions';
import { addProductToCollectionSchema } from '@/lib/validations/collection';
import { ZodError } from 'zod';
import { Prisma, UserRole } from '@prisma/client';

/** Route parameters containing the collection ID. */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/collections/[id]/products
 *
 * List all products in a collection with full product details,
 * ordered by CollectionProduct.order.
 *
 * Access rules:
 * - If the collection is public (isPublic=true): no auth required.
 * - If the collection is private: requires authentication, and the
 *   user must be the collection owner or an admin.
 *
 * @param request - Incoming HTTP request
 * @param params  - Route params containing the collection ID
 * @returns List of collection products with full product details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch the collection to determine access rules
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true, creatorId: true, isPublic: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // If the collection is not public, require authentication and ownership
    if (!collection.isPublic) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const isAdmin = session.user.role === UserRole.ADMIN;
      if (!isAdmin && !isOwnResource(session.user.id, collection.creatorId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch products in this collection, ordered by order field
    const collectionProducts = await prisma.collectionProduct.findMany({
      where: { collectionId: id },
      include: {
        product: true,
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ data: collectionProducts });
  } catch (error) {
    console.error('[API] GET /api/collections/[id]/products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections/[id]/products
 *
 * Add a product to a collection. Validates with addProductToCollectionSchema.
 *
 * Checks performed:
 * - Product exists and is active.
 * - Product is not already in the collection.
 * - Order is auto-set to max(order) + 1 within the collection.
 *
 * Access rules:
 * - Creator: can add to their own collections only.
 * - Admin: can add to any collection.
 *
 * @param request - Incoming HTTP request with JSON body: { productId }
 * @param params  - Route params containing the collection ID
 * @returns The newly created CollectionProduct entry
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - must be able to update collections (adding products is an update)
    if (!hasPermission(session.user, 'collections', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the collection
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Ownership check: creators can only modify their own collections
    const isAdmin = session.user.role === UserRole.ADMIN;
    if (!isAdmin && !isOwnResource(session.user.id, collection.creatorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { productId } = addProductToCollectionSchema.parse(body);

    // Verify the product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true, title: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: 'Product is not active and cannot be added to a collection' },
        { status: 400 }
      );
    }

    // Check if product is already in ANY collection (product can only be in 1 collection)
    const existingEntry = await prisma.collectionProduct.findFirst({
      where: { productId },
      include: { collection: { select: { name: true } } },
    });

    if (existingEntry) {
      if (existingEntry.collectionId === id) {
        return NextResponse.json(
          { error: 'Product is already in this collection' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Product is already in collection "${existingEntry.collection.name}"` },
        { status: 409 }
      );
    }

    // Determine the next order value (max + 1)
    const maxOrderResult = await prisma.collectionProduct.aggregate({
      where: { collectionId: id },
      _max: { order: true },
    });
    const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

    // Create the collection-product association
    const collectionProduct = await prisma.collectionProduct.create({
      data: {
        collectionId: id,
        productId,
        order: nextOrder,
      },
      include: {
        product: true,
      },
    });

    // Audit log (non-blocking)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'CollectionProduct',
        entityId: collectionProduct.id,
        changes: {
          collectionId: id,
          productId,
          productTitle: product.title,
        },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({ data: collectionProduct }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/collections/[id]/products error:', error);

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
          { error: 'Product is already in this collection' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to add product to collection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/[id]/products
 *
 * Remove a product from a collection. Expects a JSON body with
 * `{ productId }` identifying the product to remove.
 *
 * Access rules:
 * - Creator: can remove from their own collections only.
 * - Admin: can remove from any collection.
 *
 * @param request - Incoming HTTP request with JSON body: { productId }
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

    // Authorization - must be able to update collections (removing products is an update)
    if (!hasPermission(session.user, 'collections', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the collection
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Ownership check: creators can only modify their own collections
    const isAdmin = session.user.role === UserRole.ADMIN;
    if (!isAdmin && !isOwnResource(session.user.id, collection.creatorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body to get productId
    const body = await request.json();
    const { productId } = addProductToCollectionSchema.parse(body);

    // Find the collection-product entry
    const collectionProduct = await prisma.collectionProduct.findUnique({
      where: {
        collectionId_productId: {
          collectionId: id,
          productId,
        },
      },
    });

    if (!collectionProduct) {
      return NextResponse.json(
        { error: 'Product is not in this collection' },
        { status: 404 }
      );
    }

    // Delete the collection-product association
    await prisma.collectionProduct.delete({
      where: { id: collectionProduct.id },
    });

    // Audit log (non-blocking)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'CollectionProduct',
        entityId: collectionProduct.id,
        changes: {
          collectionId: id,
          productId,
        },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({
      message: 'Product removed from collection successfully',
    });
  } catch (error) {
    console.error('[API] DELETE /api/collections/[id]/products error:', error);

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
      { error: 'Failed to remove product from collection' },
      { status: 500 }
    );
  }
}
