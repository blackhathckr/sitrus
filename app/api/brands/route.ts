/**
 * Brands API Routes
 *
 * GET  /api/brands - List all brands (public for product filtering, admin sees all).
 *                    Supports pagination via ?page=&limit= params.
 * POST /api/brands - Create a new brand (admin only).
 *
 * @module api/brands
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { createBrandSchema } from '@/lib/validations/brand';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/brands
 *
 * Returns brands. For non-admin users, only active brands are returned.
 * Includes product count. Supports optional pagination via page/limit params.
 * If page is not provided, returns all brands (backward compatible).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const where: Prisma.BrandWhereInput = {};
    if (!isAdmin) {
      where.isActive = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If page param is provided, return paginated response
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam));
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || '15')));

      const [total, brands] = await Promise.all([
        prisma.brand.count({ where }),
        prisma.brand.findMany({
          where,
          include: {
            _count: { select: { products: true } },
          },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        data: brands,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      });
    }

    // No page param — return all brands (backward compatible for dropdowns etc.)
    const brands = await prisma.brand.findMany({
      where,
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: brands });
  } catch (error) {
    console.error('[API] GET /api/brands error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brands
 *
 * Create a new brand. Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'brands', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createBrandSchema.parse(body);

    const brand = await prisma.brand.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        registeredName: validatedData.registeredName || null,
        displayName: validatedData.displayName || null,
        logoUrl: validatedData.logoUrl || null,
        gstin: validatedData.gstin || null,
        contactPOC: validatedData.contactPOC || null,
        contactPhone: validatedData.contactPhone || null,
        commissionRate: validatedData.commissionRate ?? null,
        websiteUrl: validatedData.websiteUrl || null,
        isActive: validatedData.isActive,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Brand',
        entityId: brand.id,
        changes: { name: brand.name, slug: brand.slug },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({ data: brand }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/brands error:', error);

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

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A brand with this name or slug already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    );
  }
}
