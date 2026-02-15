/**
 * Collection Validation Schemas
 *
 * Zod schemas for collection operations including creating,
 * updating, and managing product collections on creator storefronts.
 *
 * @module lib/validations/collection
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

const COLLECTION_NAME_MIN = 2;
const COLLECTION_NAME_MAX = 50;
const COLLECTION_DESCRIPTION_MAX = 500;

// =============================================================================
// CREATE SCHEMA
// =============================================================================

/**
 * Schema for creating a new product collection.
 *
 * Collections allow creators to organize curated products into
 * themed groups on their storefront (e.g., "Summer Essentials").
 */
export const createCollectionSchema = z.object({
  /** Collection name (2-50 characters) */
  name: z
    .string()
    .min(COLLECTION_NAME_MIN, `Name must be at least ${COLLECTION_NAME_MIN} characters`)
    .max(COLLECTION_NAME_MAX, `Name must be no more than ${COLLECTION_NAME_MAX} characters`)
    .trim(),
  /** Optional description for the collection (max 500 characters) */
  description: z
    .string()
    .max(COLLECTION_DESCRIPTION_MAX, `Description must be at most ${COLLECTION_DESCRIPTION_MAX} characters`)
    .optional(),
  /** URL-friendly slug for the collection (lowercase with hyphens) */
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      'Slug must be lowercase alphanumeric with hyphens, and cannot start or end with a hyphen'
    )
    .trim(),
  /** Optional cover image URL */
  coverImage: z.string().url('Invalid cover image URL').optional(),
  /** Whether the collection is publicly visible (defaults to true) */
  isPublic: z.boolean().optional().default(true),
});

/** Inferred type for collection creation input */
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

// =============================================================================
// UPDATE SCHEMA
// =============================================================================

/**
 * Schema for updating an existing collection.
 *
 * All fields are optional; only provided fields will be updated.
 */
export const updateCollectionSchema = z.object({
  /** Updated collection name */
  name: z
    .string()
    .min(COLLECTION_NAME_MIN, `Name must be at least ${COLLECTION_NAME_MIN} characters`)
    .max(COLLECTION_NAME_MAX, `Name must be no more than ${COLLECTION_NAME_MAX} characters`)
    .trim()
    .optional(),
  /** Updated description */
  description: z
    .string()
    .max(COLLECTION_DESCRIPTION_MAX, `Description must be at most ${COLLECTION_DESCRIPTION_MAX} characters`)
    .optional(),
  /** Updated slug */
  slug: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      'Slug must be lowercase alphanumeric with hyphens, and cannot start or end with a hyphen'
    )
    .trim()
    .optional(),
  /** Updated cover image URL */
  coverImage: z.string().url('Invalid cover image URL').optional(),
  /** Updated visibility setting */
  isPublic: z.boolean().optional(),
});

/** Inferred type for collection update input */
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

// =============================================================================
// ADD PRODUCT SCHEMA
// =============================================================================

/**
 * Schema for adding a product to a collection.
 */
export const addProductToCollectionSchema = z.object({
  /** CUID of the product to add */
  productId: z.string().cuid('Invalid product ID'),
});

/** Inferred type for adding a product to a collection */
export type AddProductToCollectionInput = z.infer<typeof addProductToCollectionSchema>;
