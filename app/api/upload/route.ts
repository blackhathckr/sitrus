/**
 * File Upload API
 *
 * Handles file uploads to Cloudflare R2 storage.
 * Supports avatars and banners with type/size validation.
 *
 * @module api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import {
  uploadFile,
  generateUniqueFileName,
  validateFileType,
  validateFileSize,
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_SIZE_MB,
  MAX_BANNER_SIZE_MB,
} from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 *
 * Uploads a file to Cloudflare R2 storage. Requires authentication.
 * Accepts multipart form data with `file` and optional `folder` fields.
 *
 * Supported folders: 'avatars' (max 5MB), 'banners' (max 10MB).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'avatars';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate folder
    const validFolders = ['avatars', 'banners'];
    if (!validFolders.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Must be one of: ${validFolders.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file type (images only)
    if (!validateFileType(file.type, [...ALLOWED_IMAGE_TYPES])) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed. Accepted: JPEG, PNG, WebP` },
        { status: 400 }
      );
    }

    // Validate file size based on folder
    const maxSize = folder === 'banners' ? MAX_BANNER_SIZE_MB : MAX_AVATAR_SIZE_MB;
    if (!validateFileSize(file.size, maxSize)) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize}MB limit` },
        { status: 400 }
      );
    }

    // Generate unique file name
    const uniqueFileName = generateUniqueFileName(file.name);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const fileUrl = await uploadFile(buffer, uniqueFileName, file.type, folder);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: uniqueFileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('[API] POST /api/upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
