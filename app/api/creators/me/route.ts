/**
 * Creator Self-Service API Routes
 *
 * GET /api/creators/me - Get the authenticated creator's own profile.
 * PUT /api/creators/me - Update the authenticated creator's own profile.
 *
 * These endpoints are for creators to view and manage their own
 * storefront profile. Requires CREATOR role authentication.
 *
 * @module api/creators/me
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { updateProfileSchema } from '@/lib/validations/user';
import { deleteFile, isAzureBlobUrl } from '@/lib/storage/azure-blob';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/creators/me
 *
 * Retrieve the authenticated creator's own user record and
 * creator profile. Includes _count of links, collections,
 * and earnings for dashboard display.
 *
 * @param request - Incoming HTTP request
 * @returns Creator's user data, profile, and aggregated counts
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - must be able to read creators (CREATOR or ADMIN)
    if (!hasPermission(session.user, 'creators', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch user with profile and counts
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        image: true,
        phone: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        creatorProfile: true,
        _count: {
          select: {
            links: true,
            collections: true,
            earnings: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('[API] GET /api/creators/me error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/creators/me
 *
 * Update the authenticated creator's own profile. Validates the
 * request body with updateProfileSchema, then separates user-level
 * fields (name) from creator-profile-level fields (bio, slug, etc.)
 * and updates both in a single Prisma transaction.
 *
 * If the slug is being changed, uniqueness is verified before the
 * transaction to provide a clear error message.
 *
 * Accepted fields:
 *   - User: name
 *   - CreatorProfile: bio, instagramHandle, slug, displayName, tagline,
 *     avatarUrl, bannerUrl, youtubeUrl, twitterUrl
 *
 * @param request - Incoming HTTP request with JSON body
 * @returns Updated user and creator profile data
 */
export async function PUT(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - must be able to update creators
    if (!hasPermission(session.user, 'creators', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Verify user has a creator profile (include current avatar/banner for blob cleanup)
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { creatorProfile: { select: { id: true, slug: true, avatarUrl: true, bannerUrl: true } } },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!existingUser.creatorProfile) {
      return NextResponse.json(
        { error: 'Creator profile not found. Please contact support.' },
        { status: 404 }
      );
    }

    // If slug is being changed, check uniqueness
    if (
      validatedData.slug &&
      validatedData.slug !== existingUser.creatorProfile.slug
    ) {
      const slugExists = await prisma.creatorProfile.findUnique({
        where: { slug: validatedData.slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: 'This slug is already taken. Please choose another.' },
          { status: 409 }
        );
      }
    }

    // Separate user fields from creator profile fields
    const { name, ...profileFields } = validatedData;

    const userUpdate: Prisma.UserUpdateInput = {};
    if (name !== undefined) userUpdate.name = name;

    const profileUpdate: Prisma.CreatorProfileUpdateInput = {};
    if (profileFields.bio !== undefined) profileUpdate.bio = profileFields.bio;
    if (profileFields.instagramHandle !== undefined)
      profileUpdate.instagramHandle = profileFields.instagramHandle;
    if (profileFields.slug !== undefined)
      profileUpdate.slug = profileFields.slug;
    if (profileFields.displayName !== undefined)
      profileUpdate.displayName = profileFields.displayName;
    if (profileFields.tagline !== undefined)
      profileUpdate.tagline = profileFields.tagline;
    if (profileFields.avatarUrl !== undefined)
      profileUpdate.avatarUrl = profileFields.avatarUrl;
    if (profileFields.bannerUrl !== undefined)
      profileUpdate.bannerUrl = profileFields.bannerUrl;
    if (profileFields.youtubeUrl !== undefined)
      profileUpdate.youtubeUrl = profileFields.youtubeUrl;
    if (profileFields.twitterUrl !== undefined)
      profileUpdate.twitterUrl = profileFields.twitterUrl;

    // Clean up old Azure blobs if avatar/banner is being changed or cleared
    const oldProfile = existingUser.creatorProfile;
    if (profileUpdate.avatarUrl !== undefined && oldProfile?.avatarUrl) {
      const newUrl = profileUpdate.avatarUrl as string | null;
      if (newUrl !== oldProfile.avatarUrl && isAzureBlobUrl(oldProfile.avatarUrl)) {
        deleteFile(oldProfile.avatarUrl).catch((err) =>
          console.error('[API] Failed to delete old avatar blob:', err)
        );
      }
    }
    if (profileUpdate.bannerUrl !== undefined && oldProfile?.bannerUrl) {
      const newUrl = profileUpdate.bannerUrl as string | null;
      if (newUrl !== oldProfile.bannerUrl && isAzureBlobUrl(oldProfile.bannerUrl)) {
        deleteFile(oldProfile.bannerUrl).catch((err) =>
          console.error('[API] Failed to delete old banner blob:', err)
        );
      }
    }

    // Atomic transaction: update user and profile together
    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: userUpdate,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          image: true,
          updatedAt: true,
        },
      }),
      prisma.creatorProfile.update({
        where: { userId: session.user.id },
        data: profileUpdate,
      }),
    ]);

    // Audit log (non-blocking)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'CreatorProfile',
        entityId: existingUser.creatorProfile.id,
        changes: {
          updatedFields: Object.keys(validatedData),
        },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({
      data: {
        ...updatedUser,
        creatorProfile: updatedProfile,
      },
    });
  } catch (error) {
    console.error('[API] PUT /api/creators/me error:', error);

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
          { error: 'This slug is already taken. Please choose another.' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
