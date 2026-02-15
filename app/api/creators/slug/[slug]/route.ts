/**
 * Public Creator Storefront API
 *
 * GET /api/creators/slug/[slug] - Fetch a creator's public storefront data.
 *
 * This is the most important public-facing API endpoint. It powers the
 * creator storefront page rendered at /{slug}. No authentication required.
 *
 * Returns the creator's profile, user info (name, image), public
 * collections with their products, and a link count. Only serves
 * creators who are approved, public, and whose user account is active.
 *
 * @module api/creators/slug/[slug]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/** Route parameters containing the creator's unique slug. */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/creators/slug/[slug]
 *
 * Public endpoint to retrieve a creator's full storefront data by slug.
 *
 * Requirements for a creator to be visible:
 * - CreatorProfile.isApproved = true
 * - CreatorProfile.isPublic = true
 * - User.isActive = true
 *
 * Included data:
 * - User: name, image
 * - CreatorProfile: all fields
 * - Collections: only public, ordered by collection.order, each with
 *   products (full product details), ordered by CollectionProduct.order
 * - _count: links (for display purposes, e.g. "X products shared")
 *
 * @param request - Incoming HTTP request
 * @param params  - Route params containing the slug
 * @returns Creator storefront data or 404 if not found/not public
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid slug parameter' },
        { status: 400 }
      );
    }

    // Fetch the creator profile by slug with all storefront data
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isActive: true,
            _count: {
              select: {
                links: true,
              },
            },
          },
        },
      },
    });

    // Return 404 if profile not found or not eligible for public display
    if (!creatorProfile) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    if (
      !creatorProfile.isApproved ||
      !creatorProfile.isPublic ||
      !creatorProfile.user.isActive
    ) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Fetch public collections with products, ordered correctly
    const collections = await prisma.collection.findMany({
      where: {
        creatorId: creatorProfile.user.id,
        isPublic: true,
      },
      include: {
        products: {
          include: {
            product: {
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
                isActive: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Filter out inactive products from the response
    const collectionsWithActiveProducts = collections.map((collection) => ({
      ...collection,
      products: collection.products.filter(
        (cp) => cp.product.isActive
      ),
    }));

    // Assemble the public storefront response
    const { user, ...profileData } = creatorProfile;
    const { isActive: _isActive, _count, ...publicUserData } = user;

    return NextResponse.json({
      data: {
        user: publicUserData,
        creatorProfile: profileData,
        collections: collectionsWithActiveProducts,
        _count: {
          links: _count.links,
        },
      },
    });
  } catch (error) {
    console.error('[API] GET /api/creators/slug/[slug] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator storefront' },
      { status: 500 }
    );
  }
}
