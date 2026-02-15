/**
 * Link Detail API Routes
 *
 * GET    /api/links/[id] - Get a single link with product and recent clicks
 * PUT    /api/links/[id] - Update a link (customAlias, isActive)
 * DELETE /api/links/[id] - Delete a link
 *
 * Creators can only access their own links. Admins can access any link.
 *
 * @module api/links/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission, isOwnResource } from '@/lib/auth/permissions';
import { ZodError, z } from 'zod';
import { Prisma, UserRole } from '@prisma/client';

/** Route params shape for Next.js dynamic segments */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Schema for validating link updates.
 * Only customAlias and isActive are editable after creation.
 */
const updateLinkSchema = z.object({
  /** Updated custom alias for the short link */
  customAlias: z
    .string()
    .min(3, 'Custom alias must be at least 3 characters')
    .max(30, 'Custom alias must be no more than 30 characters')
    .regex(
      /^[a-zA-Z0-9-]+$/,
      'Custom alias must only contain letters, numbers, and hyphens'
    )
    .nullable()
    .optional(),
  /** Toggle the link's active status */
  isActive: z.boolean().optional(),
});

/**
 * GET /api/links/[id]
 *
 * Retrieve a single link by ID, including its associated product
 * details and the 10 most recent click records.
 *
 * Creators can only view their own links. Admins can view any link.
 *
 * @param request - Incoming request
 * @param params  - Route params containing the link ID
 * @returns The link with product and recent clicks
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Fetch the link with product and recent clicks
    const link = await prisma.link.findUnique({
      where: { id },
      include: {
        product: true,
        clicks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            ipHash: true,
            userAgent: true,
            referrer: true,
            country: true,
            city: true,
            device: true,
            browser: true,
            os: true,
            createdAt: true,
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Creators can only view their own links
    if (
      session.user.role === UserRole.CREATOR &&
      !isOwnResource(session.user.id, link.creatorId)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error fetching link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/links/[id]
 *
 * Update a link's customAlias or isActive status.
 * Creators can only update their own links. Admins can update any link.
 * Writes an audit log on success.
 *
 * @param request - Incoming request with partial update data
 * @param params  - Route params containing the link ID
 * @returns The updated link
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check
    const canUpdate = hasPermission(session.user, 'links', 'update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check the link exists
    const existingLink = await prisma.link.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        customAlias: true,
        isActive: true,
      },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Creators can only update their own links
    if (
      session.user.role === UserRole.CREATOR &&
      !isOwnResource(session.user.id, existingLink.creatorId)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate the update body
    const body = await request.json();
    const validatedData = updateLinkSchema.parse(body);

    // If the customAlias is being changed, check uniqueness
    if (
      validatedData.customAlias !== undefined &&
      validatedData.customAlias !== existingLink.customAlias
    ) {
      if (validatedData.customAlias !== null) {
        const aliasExists = await prisma.link.findUnique({
          where: { customAlias: validatedData.customAlias },
          select: { id: true },
        });

        if (aliasExists) {
          return NextResponse.json(
            { error: 'This custom alias is already taken' },
            { status: 409 }
          );
        }
      }
    }

    // Update the link
    const updatedLink = await prisma.link.update({
      where: { id },
      data: validatedData,
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
        action: 'UPDATE',
        entityType: 'Link',
        entityId: id,
        changes: {
          before: {
            customAlias: existingLink.customAlias,
            isActive: existingLink.isActive,
          },
          after: validatedData,
        },
      },
    });

    return NextResponse.json({
      message: 'Link updated successfully',
      link: updatedLink,
    });
  } catch (error) {
    console.error('Error updating link:', error);

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
          { error: 'This custom alias is already taken' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/links/[id]
 *
 * Delete an affiliate link. Creators can only delete their own links.
 * Admins can delete any link. Writes an audit log on success.
 *
 * @param request - Incoming request
 * @param params  - Route params containing the link ID
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

    // Authorization check
    const canDelete = hasPermission(session.user, 'links', 'delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check the link exists
    const existingLink = await prisma.link.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        shortCode: true,
        customAlias: true,
      },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Creators can only delete their own links
    if (
      session.user.role === UserRole.CREATOR &&
      !isOwnResource(session.user.id, existingLink.creatorId)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the link (cascades to clicks and earnings per schema)
    await prisma.link.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'Link',
        entityId: id,
        changes: {
          deletedLink: {
            shortCode: existingLink.shortCode,
            customAlias: existingLink.customAlias,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Link deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    );
  }
}
