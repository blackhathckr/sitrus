/**
 * Links API Routes (SitLinks)
 *
 * GET  /api/links - List affiliate links (creators see own, admins see all)
 * POST /api/links - Create a new SitLink for a product
 *
 * @module api/links
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission, isOwnResource } from '@/lib/auth/permissions';
import { createLinkSchema, linkQuerySchema } from '@/lib/validations/link';
import { ZodError } from 'zod';
import { Prisma, UserRole } from '@prisma/client';

/**
 * GET /api/links
 *
 * Retrieve affiliate links with pagination and filtering.
 * - Creators can only see their own links.
 * - Admins can see all links and optionally filter by creatorId.
 *
 * Each link includes its associated product summary (title, imageUrl,
 * price, marketplace).
 *
 * @param request - Incoming request with query params
 * @returns Paginated list of links with product info
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check
    const canRead = hasPermission(session.user, 'links', 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { creatorId, page, limit, isActive } = linkQuerySchema.parse(queryParams);

    // Build the where clause — creators are scoped to their own links
    const where: Prisma.LinkWhereInput = {};

    if (session.user.role === UserRole.CREATOR) {
      // Creators can only view their own links
      where.creatorId = session.user.id;
    } else if (creatorId) {
      // Admins can filter by a specific creator
      where.creatorId = creatorId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Execute count and data queries in parallel
    const [total, links] = await Promise.all([
      prisma.link.count({ where }),
      prisma.link.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: {
            select: {
              title: true,
              imageUrl: true,
              price: true,
              marketplace: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      data: links,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching links:', error);

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
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/links
 *
 * Create a new SitLink (affiliate short link) for a product.
 * Any authenticated user with the 'create' permission on links
 * (ADMIN or CREATOR) can create links.
 *
 * Steps:
 * 1. Validate the product exists and is active
 * 2. Generate a unique 8-character shortCode via nanoid
 * 3. If a customAlias is requested, verify its uniqueness
 * 4. Build the affiliateUrl from the product's affiliateBaseUrl or sourceUrl
 * 5. Create the Link record and return it with product info
 *
 * @param request - Incoming request with { productId, customAlias? }
 * @returns The newly created link with product details (201)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check
    const canCreate = hasPermission(session.user, 'links', 'create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { productId, customAlias } = createLinkSchema.parse(body);

    // Verify the product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        price: true,
        marketplace: true,
        sourceUrl: true,
        affiliateBaseUrl: true,
        isActive: true,
        brandId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: 'Cannot create a link for an inactive product' },
        { status: 400 }
      );
    }

    // Check customAlias uniqueness if provided
    if (customAlias) {
      const aliasExists = await prisma.link.findUnique({
        where: { customAlias },
        select: { id: true },
      });

      if (aliasExists) {
        return NextResponse.json(
          { error: 'This custom alias is already taken' },
          { status: 409 }
        );
      }
    }

    // Generate a unique 8-character short code
    const shortCode = nanoid(8);

    // Build the affiliate URL — brand products use UTM params for attribution
    const baseUrl = product.affiliateBaseUrl || product.sourceUrl;
    const separator = baseUrl.includes('?') ? '&' : '?';
    let affiliateUrl: string;

    if (product.brandId) {
      // Brand product: fetch creator slug for UTM attribution
      const creatorProfile = await prisma.creatorProfile.findUnique({
        where: { userId: session.user.id },
        select: { slug: true },
      });
      const creatorSlug = creatorProfile?.slug || session.user.id;

      affiliateUrl = `${baseUrl}${separator}utm_source=sitrus&utm_medium=creator&utm_campaign=${creatorSlug}&utm_content=${shortCode}`;
    } else {
      // Marketplace product: existing ref-based tracking
      affiliateUrl = `${baseUrl}${separator}ref=sitrus&code=${shortCode}`;
    }

    // Create the link
    const link = await prisma.link.create({
      data: {
        creatorId: session.user.id,
        productId,
        shortCode,
        customAlias: customAlias || null,
        affiliateUrl,
      },
      include: {
        product: {
          select: {
            title: true,
            imageUrl: true,
            price: true,
            marketplace: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Link',
        entityId: link.id,
        changes: {
          shortCode: link.shortCode,
          customAlias: link.customAlias,
          productId,
          productTitle: product.title,
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Link created successfully',
        link,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating link:', error);

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
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('customAlias')) {
          return NextResponse.json(
            { error: 'This custom alias is already taken' },
            { status: 409 }
          );
        }
        if (target.includes('shortCode')) {
          // Extremely rare nanoid collision — client should retry
          return NextResponse.json(
            { error: 'Short code collision. Please try again.' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'A link with these details already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 }
    );
  }
}
