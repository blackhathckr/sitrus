/**
 * Users API Routes
 *
 * GET  /api/users - List all users (with pagination, filtering, sorting)
 * POST /api/users - Create a new user (admin only)
 *
 * @module api/users
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { userQuerySchema, createUserSchema } from '@/lib/validations/user';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Generate a URL-safe slug from a display name.
 *
 * Converts to lowercase, replaces spaces with hyphens, strips
 * non-alphanumeric characters, and appends a random 4-digit suffix.
 *
 * @param name - The display name to slugify
 * @returns A unique slug string (e.g. "john-doe-4829")
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

/**
 * GET /api/users
 *
 * Lists all users with pagination, filtering by search term, role,
 * and active status, and configurable sorting. Requires admin-level
 * read permission on the 'users' resource.
 *
 * @param request - The incoming HTTP request with query parameters
 * @returns JSON response with paginated user data
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check - only admins can list users
    const canRead = hasPermission(session.user, 'users', 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { page, limit, search, role, isActive, sortBy, sortOrder } =
      userQuerySchema.parse(queryParams);

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Count total records
    const total = await prisma.user.count({ where });

    // Fetch users with pagination
    const users = await prisma.user.findMany({
      where,
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
        _count: {
          select: {
            links: true,
            earnings: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 *
 * Creates a new user (admin only). If the new user's role is CREATOR,
 * a CreatorProfile is automatically created with a generated slug.
 * Uses a Prisma transaction for atomic user + profile creation.
 *
 * @param request - The incoming HTTP request with JSON body
 * @returns JSON response with the created user (201)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check - only admins can create users
    const canCreate = hasPermission(session.user, 'users', 'create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Determine if we need a creator profile
    const isCreator = validatedData.role === 'CREATOR';
    const slug = isCreator ? generateSlug(validatedData.name) : undefined;

    // Create user (and optionally creator profile) in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          role: validatedData.role,
          isActive: validatedData.isActive,
          ...(isCreator && slug
            ? {
                creatorProfile: {
                  create: {
                    slug,
                    displayName: validatedData.name,
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
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
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          entityType: 'User',
          entityId: newUser.id,
          changes: {
            createdUser: {
              email: newUser.email,
              role: newUser.role,
            },
          },
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);

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
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
