/**
 * User Registration API
 *
 * POST /api/auth/register
 * Creates a new creator account with an auto-generated CreatorProfile.
 * Uses a Prisma transaction to atomically create both the User and
 * CreatorProfile records.
 *
 * @module api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { registerSchema } from '@/lib/validations/user';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Generate a URL-safe slug from a display name.
 *
 * Converts to lowercase, replaces spaces with hyphens, strips
 * non-alphanumeric characters (except hyphens), collapses
 * consecutive hyphens, and appends a random 4-digit suffix
 * to ensure uniqueness.
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
 * POST /api/auth/register
 *
 * Registers a new user with the CREATOR role. Validates input via
 * `registerSchema` (email, name, password, confirmPassword), hashes
 * the password, and atomically creates a User record and an
 * associated CreatorProfile within a Prisma transaction.
 *
 * @param request - The incoming HTTP request with JSON body
 * @returns JSON response with the created user data (201)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input (includes password match check via refine)
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Generate a unique slug for the creator profile
    const slug = generateSlug(validatedData.name);

    // Create user and creator profile atomically
    const user = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          role: 'CREATOR',
          creatorProfile: {
            create: {
              slug,
              displayName: validatedData.name,
              isApproved: true,
            },
          },
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

      // Create audit log within the same transaction
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'CREATE',
          entityType: 'User',
          entityId: newUser.id,
          changes: {
            type: 'user_registration',
            email: newUser.email,
            slug,
          },
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Zod validation errors
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

    // Handle Prisma unique constraint error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
