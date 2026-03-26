/**
 * File Upload API
 *
 * Handles file uploads to Azure Blob Storage.
 * Supports avatars, banners, and brand logos with type/size validation.
 *
 * @module api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import {
  uploadFile,
  deleteFile,
  generateUniqueFileName,
  validateFileType,
  validateFileSize,
  isAzureBlobUrl,
  getMaxSizeForFolder,
  ALLOWED_IMAGE_TYPES,
  VALID_FOLDERS,
  type UploadFolder,
} from '@/lib/storage/azure-blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 *
 * Uploads a file to Azure Blob Storage. Requires authentication.
 * Accepts multipart form data with `file`, `folder`, and optional `subfolder` fields.
 *
 * Supported folders: 'avatars', 'banners', 'brands'.
 * For avatars/banners, subfolder defaults to the user's ID.
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
    const subfolder = (formData.get('subfolder') as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate folder
    if (!VALID_FOLDERS.includes(folder as UploadFolder)) {
      return NextResponse.json(
        { error: `Invalid folder. Must be one of: ${VALID_FOLDERS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!validateFileType(file.type, [...ALLOWED_IMAGE_TYPES])) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed. Accepted: JPEG, PNG, WebP` },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = getMaxSizeForFolder(folder as UploadFolder);
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

    // Determine subfolder: for avatars/banners use userId, otherwise use provided or none
    const effectiveSubfolder =
      (folder === 'avatars' || folder === 'banners')
        ? (subfolder || session.user.id)
        : subfolder;

    // Upload to Azure Blob Storage
    const fileUrl = await uploadFile(
      buffer,
      uniqueFileName,
      file.type,
      folder as UploadFolder,
      effectiveSubfolder
    );

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

/**
 * DELETE /api/upload
 *
 * Deletes a file from Azure Blob Storage by URL. Requires authentication.
 * Only deletes files that belong to our Azure storage.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isAzureBlobUrl(url)) {
      return NextResponse.json(
        { error: 'URL is not from our storage' },
        { status: 400 }
      );
    }

    const deleted = await deleteFile(url);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/upload error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
