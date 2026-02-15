/**
 * Creator Validation Schemas
 *
 * Zod schemas for creator profile management and querying.
 * Used by creators to set up their storefront and by admins
 * to search and manage creator accounts.
 *
 * @module lib/validations/creator
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

const BIO_MAX_LENGTH = 500;
const TAGLINE_MAX_LENGTH = 100;
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 30;

// =============================================================================
// PROFILE SCHEMA
// =============================================================================

/**
 * Schema for creating or updating a creator's profile.
 *
 * The slug is required as it serves as the creator's unique
 * storefront URL identifier (e.g., sitrus.in/@slug).
 */
export const creatorProfileSchema = z.object({
  /** Instagram handle without the @ prefix */
  instagramHandle: z
    .string()
    .regex(
      /^[a-zA-Z0-9._]+$/,
      'Instagram handle must not include @ and only contain letters, numbers, dots, and underscores'
    )
    .optional(),
  /** Creator biography (max 500 characters) */
  bio: z
    .string()
    .max(BIO_MAX_LENGTH, `Bio must be at most ${BIO_MAX_LENGTH} characters`)
    .optional(),
  /** URL-friendly slug for the creator's storefront */
  slug: z
    .string()
    .min(SLUG_MIN_LENGTH, `Slug must be at least ${SLUG_MIN_LENGTH} characters`)
    .max(SLUG_MAX_LENGTH, `Slug must be no more than ${SLUG_MAX_LENGTH} characters`)
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/,
      'Slug must be lowercase alphanumeric with hyphens, and cannot start or end with a hyphen'
    ),
  /** Display name shown on the storefront */
  displayName: z.string().max(50).trim().optional(),
  /** Short tagline (max 100 characters) */
  tagline: z
    .string()
    .max(TAGLINE_MAX_LENGTH, `Tagline must be at most ${TAGLINE_MAX_LENGTH} characters`)
    .optional(),
  /** YouTube channel or video URL */
  youtubeUrl: z.string().url('Invalid YouTube URL').optional(),
  /** Twitter/X profile URL */
  twitterUrl: z.string().url('Invalid Twitter URL').optional(),
});

/** Inferred type for creator profile input */
export type CreatorProfileInput = z.infer<typeof creatorProfileSchema>;

// =============================================================================
// QUERY SCHEMA
// =============================================================================

/**
 * Schema for querying creators with pagination and filtering.
 *
 * Supports text search across creator names/handles and
 * filtering by approval status.
 */
export const creatorQuerySchema = z.object({
  /** Free-text search across creator names, handles, and slugs */
  search: z.string().optional(),
  /** Filter by approval status */
  isApproved: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional(),
  /** Page number for pagination (1-indexed) */
  page: z.coerce.number().int().positive().optional().default(1),
  /** Number of results per page */
  limit: z.coerce.number().int().positive().max(100, 'Limit cannot exceed 100').optional().default(20),
});

/** Inferred type for creator query input */
export type CreatorQueryInput = z.infer<typeof creatorQuerySchema>;
