/**
 * User Detail API Routes
 *
 * GET    /api/users/[id] - Get user by ID
 * PUT    /api/users/[id] - Update user (admin: all fields; self: limited fields)
 * DELETE /api/users/[id] - Soft-delete user (set isActive=false)
 *
 * @module api/users/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission, isOwnResource } from '@/lib/auth/permissions';
import { updateUserSchema } from '@/lib/validations/user';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/** Route params shape for Next.js 15 dynamic segments */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 *
 * Fetches a single user by ID. Users can view their own profile;
 * viewing other users requires admin-level read permission.
 * Includes the creator profile and counts of links and earnings.
 *
 * @param request - The incoming HTTP request
 * @param params  - Route parameters containing the user ID
 * @returns JSON response with user details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can view their own profile, or need read permission for others
    const isOwnProfile = isOwnResource(session.user.id, id);
    if (!isOwnProfile) {
      const canRead = hasPermission(session.user, 'users', 'read');
      if (!canRead) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch user with related data
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        creatorProfile: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            bio: true,
            instagramHandle: true,
            avatarUrl: true,
            bannerUrl: true,
            tagline: true,
            youtubeUrl: true,
            twitterUrl: true,
            isApproved: true,
            isPublic: true,
          },
        },
        _count: {
          select: {
            links: true,
            earnings: true,
            payouts: true,
            collections: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id]
 *
 * Updates a user record. Users can update their own profile with
 * limited fields (name, image). Admins can update any user with
 * all fields from `updateUserSchema` (email, name, role, isActive, image).
 *
 * @param request - The incoming HTTP request with JSON body
 * @param params  - Route parameters containing the user ID
 * @returns JSON response with the updated user
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isOwnProfile = isOwnResource(session.user.id, id);
    const body = await request.json();

    if (isOwnProfile) {
      // Users can only update their own name and image
      const { name, image } = body;
      const updateData: Prisma.UserUpdateInput = {};

      if (name) updateData.name = name;
      if (image !== undefined) updateData.image = image;

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          isActive: true,
          updatedAt: true,
          creatorProfile: {
            select: {
              id: true,
              slug: true,
              displayName: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          entityType: 'User',
          entityId: id,
          changes: {
            before: { name: existingUser.name },
            after: updateData,
          },
        },
      });

      return NextResponse.json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    }

    // Admin updating another user
    const canUpdate = hasPermission(session.user, 'users', 'update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate input for admin updates
    const validatedData = updateUserSchema.parse(body);

    // Check email uniqueness if changing email
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        updatedAt: true,
        creatorProfile: {
          select: {
            id: true,
            slug: true,
            displayName: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'User',
        entityId: id,
        changes: {
          before: existingUser,
          after: validatedData,
        },
      },
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);

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
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 *
 * Soft-deletes a user by setting `isActive` to false. Only admins
 * with delete permission can perform this action. Users cannot
 * delete their own account.
 *
 * @param request - The incoming HTTP request
 * @param params  - Route parameters containing the user ID
 * @returns JSON response confirming deactivation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check
    const canDelete = hasPermission(session.user, 'users', 'delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting yourself
    if (isOwnResource(session.user.id, id)) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Prevent deleting another admin
    if (existingUser.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot deactivate another admin account' },
        { status: 400 }
      );
    }

    // Soft delete: set isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'User',
        entityId: id,
        changes: {
          deactivatedUser: existingUser.email,
          previousStatus: existingUser.isActive,
        },
      },
    });

    return NextResponse.json({
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
