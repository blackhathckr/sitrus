/**
 * Brand Detail API Routes
 *
 * GET    /api/brands/[id] - Get a brand with product count.
 * PUT    /api/brands/[id] - Update a brand (admin only).
 * DELETE /api/brands/[id] - Delete a brand (admin only, unlinks products).
 *
 * @module api/brands/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { updateBrandSchema } from '@/lib/validations/brand';
import { deleteFile, isAzureBlobUrl } from '@/lib/storage/azure-blob';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/brands/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        products: {
          take: 10,
          select: { id: true, title: true, imageUrl: true, price: true, marketplace: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json({ data: brand });
  } catch (error) {
    console.error('[API] GET /api/brands/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/brands/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'brands', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateBrandSchema.parse(body);

    // If logo is changing and old logo is Azure, delete old blob
    if (
      validatedData.logoUrl !== undefined &&
      existing.logoUrl &&
      validatedData.logoUrl !== existing.logoUrl &&
      isAzureBlobUrl(existing.logoUrl)
    ) {
      deleteFile(existing.logoUrl).catch((err) =>
        console.error('[API] Failed to delete old brand logo:', err)
      );
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.slug !== undefined && { slug: validatedData.slug }),
        ...(validatedData.registeredName !== undefined && {
          registeredName: validatedData.registeredName || null,
        }),
        ...(validatedData.displayName !== undefined && {
          displayName: validatedData.displayName || null,
        }),
        ...(validatedData.logoUrl !== undefined && {
          logoUrl: validatedData.logoUrl || null,
        }),
        ...(validatedData.gstin !== undefined && {
          gstin: validatedData.gstin || null,
        }),
        ...(validatedData.contactPOC !== undefined && {
          contactPOC: validatedData.contactPOC || null,
        }),
        ...(validatedData.contactPhone !== undefined && {
          contactPhone: validatedData.contactPhone || null,
        }),
        ...(validatedData.commissionRate !== undefined && {
          commissionRate: validatedData.commissionRate ?? null,
        }),
        ...(validatedData.websiteUrl !== undefined && {
          websiteUrl: validatedData.websiteUrl || null,
        }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
      include: { _count: { select: { products: true } } },
    });

    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'Brand',
        entityId: id,
        changes: { updatedFields: Object.keys(validatedData) },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[API] PUT /api/brands/[id] error:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A brand with this name or slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/brands/[id]
 *
 * Deletes a brand. Products with this brandId get set to null (onDelete: SetNull).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'brands', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.brand.findUnique({
      where: { id },
      select: { id: true, name: true, logoUrl: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Delete logo blob if it's in Azure
    if (existing.logoUrl && isAzureBlobUrl(existing.logoUrl)) {
      deleteFile(existing.logoUrl).catch((err) =>
        console.error('[API] Failed to delete brand logo:', err)
      );
    }

    await prisma.brand.delete({ where: { id } });

    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'Brand',
        entityId: id,
        changes: { deletedBrand: existing.name },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('[API] DELETE /api/brands/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    );
  }
}
