/**
 * Product Detail API Routes
 *
 * GET    /api/products/[id] - Get a single product by ID (public)
 * PUT    /api/products/[id] - Update a product (admin only)
 * DELETE /api/products/[id] - Soft-delete a product (admin only)
 *
 * @module api/products/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { createProductSchema } from '@/lib/validations/product';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/** Route params shape for Next.js dynamic segments */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]
 *
 * Retrieve a single active product by its ID. This is a public endpoint
 * that does not require authentication. Includes a count of affiliate
 * links created for this product.
 *
 * @param request - Incoming request
 * @param params  - Route params containing the product ID
 * @returns The product object or 404 if not found / inactive
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id, isActive: true },
      include: {
        _count: {
          select: { links: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]
 *
 * Update an existing product. Restricted to ADMIN users.
 * Accepts a partial body validated against the createProductSchema
 * (all fields optional). Writes an audit log on success.
 *
 * @param request - Incoming request with partial product data
 * @param params  - Route params containing the product ID
 * @returns The updated product
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check — only admins can update products
    const canUpdate = hasPermission(session.user, 'products', 'update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check the product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        price: true,
        marketplace: true,
        isActive: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate body as a partial of the create schema
    const body = await request.json();
    const partialSchema = createProductSchema.partial();
    const validatedData = partialSchema.parse(body);

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: validatedData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'Product',
        entityId: id,
        changes: {
          before: {
            title: existingProduct.title,
            price: existingProduct.price,
            marketplace: existingProduct.marketplace,
          },
          after: validatedData,
        },
      },
    });

    return NextResponse.json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);

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
          { error: 'A product with these details already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 *
 * Soft-delete a product by setting isActive to false.
 * Restricted to ADMIN users. The product remains in the database
 * but is excluded from public queries. Writes an audit log on success.
 *
 * @param request - Incoming request
 * @param params  - Route params containing the product ID
 * @returns Success message
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check — only admins can delete products
    const canDelete = hasPermission(session.user, 'products', 'delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check the product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { id: true, title: true, isActive: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!existingProduct.isActive) {
      return NextResponse.json(
        { error: 'Product is already deactivated' },
        { status: 400 }
      );
    }

    // Soft-delete: set isActive to false
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'Product',
        entityId: id,
        changes: {
          softDeleted: true,
          productTitle: existingProduct.title,
        },
      },
    });

    return NextResponse.json({
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
