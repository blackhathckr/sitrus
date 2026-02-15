/**
 * Cloudflare R2 Storage Module
 *
 * S3-compatible object storage client for managing file uploads,
 * deletions, and listings on Cloudflare R2. Used for storing
 * user avatars, banners, product images, and other media assets.
 *
 * @module lib/storage/r2
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Allowed MIME types for image uploads */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Maximum file size for avatar uploads (in MB) */
export const MAX_AVATAR_SIZE_MB = 5;

/** Maximum file size for banner uploads (in MB) */
export const MAX_BANNER_SIZE_MB = 10;

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

/**
 * Retrieves and validates required R2 environment variables.
 *
 * @throws {Error} If any required environment variable is missing
 * @returns The validated R2 configuration
 */
function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw new Error(
      'Missing required R2 environment variables. ' +
        'Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL are set.'
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

// =============================================================================
// CLIENT SINGLETON
// =============================================================================

let r2Client: S3Client | null = null;

/**
 * Creates or returns the singleton Cloudflare R2 client.
 *
 * Uses S3-compatible API with the R2 endpoint format:
 * `https://{accountId}.r2.cloudflarestorage.com`
 *
 * @returns The S3Client configured for Cloudflare R2
 */
export function createR2Client(): S3Client {
  if (r2Client) {
    return r2Client;
  }

  const { accountId, accessKeyId, secretAccessKey } = getR2Config();

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2Client;
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Uploads a file buffer to Cloudflare R2 storage.
 *
 * The file is stored at `{folder}/{fileName}` (or just `{fileName}` if
 * no folder is specified). Returns the publicly accessible URL.
 *
 * @param file - The file contents as a Buffer
 * @param fileName - The destination file name (should be unique)
 * @param contentType - The MIME type of the file (e.g., 'image/png')
 * @param folder - Optional folder/prefix for organizing files
 * @returns The public URL of the uploaded file
 *
 * @example
 * ```ts
 * const url = await uploadFile(buffer, 'avatar.webp', 'image/webp', 'avatars');
 * // => "https://cdn.sitrus.in/avatars/avatar.webp"
 * ```
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder?: string
): Promise<string> {
  const client = createR2Client();
  const { bucketName, publicUrl } = getR2Config();

  const key = folder ? `${folder}/${fileName}` : fileName;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await client.send(command);

  // Construct the public URL, ensuring no double slashes
  const normalizedPublicUrl = publicUrl.replace(/\/$/, '');
  return `${normalizedPublicUrl}/${key}`;
}

/**
 * Deletes a file from Cloudflare R2 storage by its public URL.
 *
 * Extracts the object key from the public URL and issues a delete command.
 *
 * @param fileUrl - The full public URL of the file to delete
 * @returns `true` if the deletion succeeded, `false` otherwise
 *
 * @example
 * ```ts
 * const deleted = await deleteFile('https://cdn.sitrus.in/avatars/abc123.webp');
 * ```
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    const client = createR2Client();
    const { bucketName, publicUrl } = getR2Config();

    // Extract the object key from the full public URL
    const normalizedPublicUrl = publicUrl.replace(/\/$/, '');
    const key = fileUrl.replace(`${normalizedPublicUrl}/`, '');

    if (!key || key === fileUrl) {
      console.error('[R2] Could not extract object key from URL:', fileUrl);
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    console.error('[R2] Failed to delete file:', error);
    return false;
  }
}

/**
 * Lists all files within an optional folder prefix in R2 storage.
 *
 * Returns an array of object keys. Useful for auditing or cleanup tasks.
 *
 * @param folder - Optional folder/prefix to scope the listing
 * @returns An array of object keys (file paths within the bucket)
 *
 * @example
 * ```ts
 * const files = await listFiles('avatars');
 * // => ["avatars/abc123.webp", "avatars/def456.png"]
 * ```
 */
export async function listFiles(folder?: string): Promise<string[]> {
  const client = createR2Client();
  const { bucketName } = getR2Config();

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: folder ? `${folder}/` : undefined,
  });

  const response = await client.send(command);

  if (!response.Contents) {
    return [];
  }

  return response.Contents.filter((object) => object.Key != null).map(
    (object) => object.Key as string
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a unique file name by prepending a UUID to the original extension.
 *
 * This prevents naming collisions when multiple users upload files with
 * the same original name.
 *
 * @param originalFileName - The original file name (e.g., 'photo.jpg')
 * @returns A unique file name (e.g., 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg')
 *
 * @example
 * ```ts
 * const name = generateUniqueFileName('my-photo.png');
 * // => "f47ac10b-58cc-4372-a567-0e02b2c3d479.png"
 * ```
 */
export function generateUniqueFileName(originalFileName: string): string {
  const extension = path.extname(originalFileName).toLowerCase();
  const uniqueId = crypto.randomUUID();
  return `${uniqueId}${extension}`;
}

/**
 * Validates whether a file's content type is in the list of allowed types.
 *
 * @param contentType - The MIME type to validate (e.g., 'image/png')
 * @param allowedTypes - An array of permitted MIME types
 * @returns `true` if the content type is allowed, `false` otherwise
 *
 * @example
 * ```ts
 * const isValid = validateFileType('image/png', ALLOWED_IMAGE_TYPES);
 * // => true
 *
 * const isInvalid = validateFileType('application/pdf', ALLOWED_IMAGE_TYPES);
 * // => false
 * ```
 */
export function validateFileType(contentType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(contentType);
}

/**
 * Validates whether a file's size is within the maximum allowed limit.
 *
 * @param fileSize - The file size in bytes
 * @param maxSizeInMB - The maximum allowed size in megabytes
 * @returns `true` if the file size is within the limit, `false` otherwise
 *
 * @example
 * ```ts
 * const isValid = validateFileSize(2_000_000, MAX_AVATAR_SIZE_MB); // 2 MB
 * // => true
 *
 * const isTooBig = validateFileSize(12_000_000, MAX_AVATAR_SIZE_MB); // 12 MB
 * // => false
 * ```
 */
export function validateFileSize(fileSize: number, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSize > 0 && fileSize <= maxSizeInBytes;
}
