/**
 * Creator Detail API Routes (Admin Only)
 *
 * GET    /api/creators/[id] - Get full creator profile with user info and counts.
 * PUT    /api/creators/[id] - Update user fields and/or creator profile fields.
 * DELETE /api/creators/[id] - Deactivate a creator (soft delete: isActive=false).
 *
 * All endpoints require ADMIN role. Creators manage their own profile
 * via /api/creators/me instead.
 *
 * @module api/creators/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';

/** Route parameters containing the creator's user ID. */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Validation schema for admin updates to a creator.
 *
 * Supports updating both User-level fields (name, isActive)
 * and CreatorProfile-level fields (isApproved, instagramHandle,
 * bio, slug, displayName, tagline).
 */
const adminUpdateCreatorSchema = z.object({
  // User fields
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .trim()
    .optional(),
  isActive: z.boolean().optional(),

  // CreatorProfile fields
  isApproved: z.boolean().optional(),
  instagramHandle: z
    .string()
    .regex(
      /^[a-zA-Z0-9._]+$/,
      'Instagram handle must only contain letters, numbers, dots, and underscores'
    )
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must be at most 500 characters')
    .optional(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(30, 'Slug must be at most 30 characters')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/,
      'Slug must be lowercase alphanumeric with hyphens'
    )
    .optional(),
  displayName: z.string().max(50).trim().optional(),
  tagline: z
    .string()
    .max(100, 'Tagline must be at most 100 characters')
    .optional(),
});

/**
 * GET /api/creators/[id]
 *
 * Retrieve a full creator profile by user ID. Admin only.
 * Includes user info, all creator profile fields, and _count
 * of links and collections.
 *
 * @param request - Incoming HTTP request
 * @param params  - Route params containing the user ID
 * @returns Full creator profile with counts
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - admin only
    if (!hasPermission(session.user, 'creators', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch user with creator profile and counts
    const user = await prisma.user.findUnique({
      where: { id },
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
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('[API] GET /api/creators/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/creators/[id]
 *
 * Update a creator's user and profile fields. Admin only.
 * Uses a Prisma transaction to atomically update both the User
 * record and the associated CreatorProfile.
 *
 * Accepted user fields: name, isActive
 * Accepted profile fields: isApproved, instagramHandle, bio, slug, displayName, tagline
 *
 * @param request - Incoming HTTP request with JSON body
 * @param params  - Route params containing the user ID
 * @returns Updated creator data
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - admin only
    if (!hasPermission(session.user, 'creators', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validatedData = adminUpdateCreatorSchema.parse(body);

    // Verify creator exists and has a profile
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { creatorProfile: { select: { id: true, slug: true } } },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (!existingUser.creatorProfile) {
      return NextResponse.json(
        { error: 'User does not have a creator profile' },
        { status: 404 }
      );
    }

    // If slug is being changed, check uniqueness
    if (validatedData.slug && validatedData.slug !== existingUser.creatorProfile.slug) {
      const slugExists = await prisma.creatorProfile.findUnique({
        where: { slug: validatedData.slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: 'A creator with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Separate user fields from profile fields
    const { name, isActive, ...profileFields } = validatedData;
    const userUpdate: Prisma.UserUpdateInput = {};
    if (name !== undefined) userUpdate.name = name;
    if (isActive !== undefined) userUpdate.isActive = isActive;

    const profileUpdate: Prisma.CreatorProfileUpdateInput = {};
    if (profileFields.isApproved !== undefined)
      profileUpdate.isApproved = profileFields.isApproved;
    if (profileFields.instagramHandle !== undefined)
      profileUpdate.instagramHandle = profileFields.instagramHandle;
    if (profileFields.bio !== undefined) profileUpdate.bio = profileFields.bio;
    if (profileFields.slug !== undefined) profileUpdate.slug = profileFields.slug;
    if (profileFields.displayName !== undefined)
      profileUpdate.displayName = profileFields.displayName;
    if (profileFields.tagline !== undefined)
      profileUpdate.tagline = profileFields.tagline;

    // Atomic transaction: update user and profile together
    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
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
        where: { userId: id },
        data: profileUpdate,
      }),
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'CreatorProfile',
        entityId: existingUser.creatorProfile.id,
        changes: {
          before: {
            name: existingUser.name,
            isActive: existingUser.isActive,
            slug: existingUser.creatorProfile.slug,
          },
          after: validatedData,
        },
      },
    });

    return NextResponse.json({
      data: {
        ...updatedUser,
        creatorProfile: updatedProfile,
      },
    });
  } catch (error) {
    console.error('[API] PUT /api/creators/[id] error:', error);

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
          { error: 'A creator with this slug already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update creator' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/creators/[id]
 *
 * Deactivate a creator by setting isActive=false on the User record.
 * This is a soft delete; the creator's data is preserved but they
 * can no longer sign in or appear in public listings.
 *
 * @param request - Incoming HTTP request
 * @param params  - Route params containing the user ID
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

    // Authorization - admin only
    if (!hasPermission(session.user, 'creators', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent admin from deactivating themselves
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Verify user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isActive: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (!existingUser.isActive) {
      return NextResponse.json(
        { error: 'Creator is already deactivated' },
        { status: 400 }
      );
    }

    // Soft delete: set isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'User',
        entityId: id,
        changes: {
          deactivatedUser: existingUser.email,
        },
      },
    });

    return NextResponse.json({
      message: 'Creator deactivated successfully',
    });
  } catch (error) {
    console.error('[API] DELETE /api/creators/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate creator' },
      { status: 500 }
    );
  }
}
