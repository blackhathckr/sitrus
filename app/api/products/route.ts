/**
 * Products API Routes
 *
 * GET  /api/products - Public product catalog with search, filtering, and pagination
 * POST /api/products - Create a new product (admin only)
 *
 * @module api/products
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { productSearchSchema, createProductSchema } from '@/lib/validations/product';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/products
 *
 * Browse the public product catalog with support for:
 * - Category, marketplace, and brand filtering
 * - Price range filtering (minPrice / maxPrice)
 * - Free-text search across product titles
 * - Sorting by price, rating, or recency
 * - Cursor-free page-based pagination
 *
 * Only active products (isActive=true) are returned.
 *
 * @param request - Incoming request with search params
 * @returns Paginated list of products with metadata
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const {
      category,
      marketplace,
      search,
      minPrice,
      maxPrice,
      brand,
      brandId,
      page,
      limit,
      sortBy,
    } = productSearchSchema.parse(queryParams);

    // Build the where clause — only active products are publicly visible
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (marketplace) {
      where.marketplace = marketplace;
    }

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // Map sortBy option to Prisma orderBy clause
    const sortMapping: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      rating: { rating: 'desc' },
      newest: { createdAt: 'desc' },
    };
    const orderBy = sortBy ? sortMapping[sortBy] : { createdAt: 'desc' };

    // Execute count and data queries in parallel for performance
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          images: true,
          price: true,
          originalPrice: true,
          currency: true,
          sourceUrl: true,
          marketplace: true,
          category: true,
          subCategory: true,
          brand: true,
          rating: true,
          reviewCount: true,
          inStock: true,
          commissionRate: true,
          createdAt: true,
          _count: {
            select: { links: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);

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
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 *
 * Create a new product in the catalog. Restricted to ADMIN users.
 * Validates the request body against the createProductSchema and
 * writes an audit log entry on success.
 *
 * @param request - Incoming request with product data in the body
 * @returns The newly created product with 201 status
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check — only admins can create products
    const canCreate = hasPermission(session.user, 'products', 'create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    // Create the product
    const product = await prisma.product.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        imageUrl: validatedData.imageUrl,
        images: validatedData.images ?? [],
        price: validatedData.price,
        originalPrice: validatedData.originalPrice,
        sourceUrl: validatedData.sourceUrl,
        marketplace: validatedData.marketplace,
        category: validatedData.category,
        subCategory: validatedData.subCategory,
        brand: validatedData.brand,
        rating: validatedData.rating,
        reviewCount: validatedData.reviewCount,
        commissionRate: validatedData.commissionRate,
        affiliateBaseUrl: validatedData.affiliateBaseUrl,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Product',
        entityId: product.id,
        changes: {
          title: product.title,
          marketplace: product.marketplace,
          price: product.price,
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Product created successfully',
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);

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
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
