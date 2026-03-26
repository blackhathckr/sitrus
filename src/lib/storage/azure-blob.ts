/**
 * Azure Blob Storage Module
 *
 * Handles file uploads, deletions, and management for Sitrus.
 * Uses a hierarchical container structure for organization:
 *
 *   Container: sitrus-uploads (configurable via env)
 *   ├── avatars/{userId}/{uuid}.{ext}
 *   ├── banners/{userId}/{uuid}.{ext}
 *   ├── brands/{uuid}.{ext}
 *   ├── products/{uuid}.{ext}       (future)
 *   └── collections/{uuid}.{ext}    (future)
 *
 * @module lib/storage/azure-blob
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  ContainerClient,
} from '@azure/storage-blob';
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

/** Maximum file size for brand logo uploads (in MB) */
export const MAX_BRAND_LOGO_SIZE_MB = 5;

/** Valid upload folders */
export const VALID_FOLDERS = ['avatars', 'banners', 'brands', 'products', 'collections'] as const;
export type UploadFolder = (typeof VALID_FOLDERS)[number];

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function getAzureConfig() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'sitrus-uploads';

  if (!accountName || !accountKey) {
    throw new Error(
      'Missing required Azure Storage environment variables. ' +
        'Ensure AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY are set.'
    );
  }

  return { accountName, accountKey, containerName };
}

// =============================================================================
// CLIENT SINGLETON
// =============================================================================

let containerClient: ContainerClient | null = null;

/**
 * Returns the singleton Azure Blob container client.
 * Creates the container if it doesn't exist.
 */
export function getContainerClient(): ContainerClient {
  if (containerClient) return containerClient;

  const { accountName, accountKey, containerName } = getAzureConfig();

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    sharedKeyCredential
  );

  containerClient = blobServiceClient.getContainerClient(containerName);
  return containerClient;
}

/**
 * Ensures the storage container exists (call once on app init or first upload).
 */
export async function ensureContainer(): Promise<void> {
  const client = getContainerClient();
  await client.createIfNotExists({ access: 'blob' });
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Uploads a file buffer to Azure Blob Storage.
 *
 * @param file - The file contents as a Buffer
 * @param fileName - The unique destination file name
 * @param contentType - The MIME type of the file
 * @param folder - The folder path (e.g. 'avatars', 'banners', 'brands')
 * @param subfolder - Optional subfolder (e.g. userId for avatars/banners)
 * @returns The public URL of the uploaded blob
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: UploadFolder,
  subfolder?: string
): Promise<string> {
  const client = getContainerClient();
  await ensureContainer();

  const blobPath = subfolder ? `${folder}/${subfolder}/${fileName}` : `${folder}/${fileName}`;
  const blockBlobClient = client.getBlockBlobClient(blobPath);

  await blockBlobClient.upload(file, file.length, {
    blobHTTPHeaders: {
      blobContentType: contentType,
      blobCacheControl: 'public, max-age=31536000',
    },
  });

  return blockBlobClient.url;
}

/**
 * Deletes a blob by its full public URL.
 *
 * @param blobUrl - The full URL of the blob to delete
 * @returns true if deleted, false on failure
 */
export async function deleteFile(blobUrl: string): Promise<boolean> {
  try {
    const blobPath = extractBlobPath(blobUrl);
    if (!blobPath) {
      console.error('[Azure] Could not extract blob path from URL:', blobUrl);
      return false;
    }

    const client = getContainerClient();
    const blockBlobClient = client.getBlockBlobClient(blobPath);
    await blockBlobClient.deleteIfExists();
    return true;
  } catch (error) {
    console.error('[Azure] Failed to delete file:', error);
    return false;
  }
}

/**
 * Deletes all blobs under a given prefix (folder path).
 * Useful for cleaning up all avatars for a user, etc.
 *
 * @param prefix - The blob path prefix (e.g. 'avatars/userId123')
 * @returns Number of blobs deleted
 */
export async function deleteByPrefix(prefix: string): Promise<number> {
  try {
    const client = getContainerClient();
    let count = 0;

    for await (const blob of client.listBlobsFlat({ prefix: `${prefix}/` })) {
      await client.getBlockBlobClient(blob.name).deleteIfExists();
      count++;
    }

    return count;
  } catch (error) {
    console.error('[Azure] Failed to delete by prefix:', error);
    return 0;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a unique file name using UUID + original extension.
 */
export function generateUniqueFileName(originalFileName: string): string {
  const extension = path.extname(originalFileName).toLowerCase();
  const uniqueId = crypto.randomUUID();
  return `${uniqueId}${extension}`;
}

/**
 * Validates whether a file's content type is allowed.
 */
export function validateFileType(contentType: string, allowedTypes: readonly string[]): boolean {
  return allowedTypes.includes(contentType);
}

/**
 * Validates whether a file's size is within the limit.
 */
export function validateFileSize(fileSize: number, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSize > 0 && fileSize <= maxSizeInBytes;
}

/**
 * Checks if a URL is from our Azure Blob Storage.
 */
export function isAzureBlobUrl(url: string): boolean {
  try {
    const { accountName } = getAzureConfig();
    return url.includes(`${accountName}.blob.core.windows.net`);
  } catch {
    return false;
  }
}

/**
 * Extracts the blob path from a full Azure Blob URL.
 * E.g. "https://account.blob.core.windows.net/container/avatars/uid/file.jpg"
 *    → "avatars/uid/file.jpg"
 */
export function extractBlobPath(blobUrl: string): string | null {
  try {
    const { accountName, containerName } = getAzureConfig();
    const baseUrl = `https://${accountName}.blob.core.windows.net/${containerName}/`;
    if (!blobUrl.startsWith(baseUrl)) return null;
    return blobUrl.slice(baseUrl.length);
  } catch {
    return null;
  }
}

/**
 * Returns the max file size in MB for a given folder.
 */
export function getMaxSizeForFolder(folder: UploadFolder): number {
  switch (folder) {
    case 'banners':
      return MAX_BANNER_SIZE_MB;
    case 'brands':
      return MAX_BRAND_LOGO_SIZE_MB;
    default:
      return MAX_AVATAR_SIZE_MB;
  }
}
