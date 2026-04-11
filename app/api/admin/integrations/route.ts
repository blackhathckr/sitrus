/**
 * Brand Integrations API Routes
 *
 * GET  /api/admin/integrations - List all brand integrations (admin only)
 * POST /api/admin/integrations - Create a new brand integration (admin only)
 *
 * Credentials are stored AES-256-GCM encrypted in the database. They are
 * NEVER returned in plaintext via API responses.
 *
 * @module api/admin/integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';
import { encrypt } from '@/lib/crypto/encryption';
import { createIntegrationSchema } from '@/lib/validations/integration';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/integrations
 *
 * List all brand integrations with sync status. Credentials are masked.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'integrations', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const integrations = await prisma.brandIntegration.findMany({
      select: {
        id: true,
        brandId: true,
        provider: true,
        locationKey: true,
        syncEnabled: true,
        lastProductSync: true,
        lastInventorySync: true,
        lastOrderSync: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: integrations });
  } catch (error) {
    console.error('[API] GET /api/admin/integrations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/integrations
 *
 * Create a new brand integration. Encrypts credentials before storage.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'integrations', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createIntegrationSchema.parse(body);

    // Verify the brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: validatedData.brandId },
      select: { id: true, name: true },
    });

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Encrypt credentials
    const integration = await prisma.brandIntegration.create({
      data: {
        brandId: validatedData.brandId,
        provider: validatedData.provider,
        apiKeyEnc: encrypt(validatedData.apiKey),
        emailEnc: encrypt(validatedData.email),
        passwordEnc: encrypt(validatedData.password),
        locationKey: validatedData.locationKey,
      },
      select: {
        id: true,
        brandId: true,
        provider: true,
        locationKey: true,
        syncEnabled: true,
        createdAt: true,
      },
    });

    // Audit log
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'BrandIntegration',
        entityId: integration.id,
        changes: {
          brandId: validatedData.brandId,
          brandName: brand.name,
          provider: validatedData.provider,
        },
      },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({ data: integration }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/admin/integrations error:', error);

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
          { error: 'An integration already exists for this brand' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}
