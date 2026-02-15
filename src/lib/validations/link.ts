/**
 * Link Validation Schemas
 *
 * Zod schemas for affiliate link (SitLink) operations including
 * creation with optional custom aliases and link querying.
 *
 * @module lib/validations/link
 */

import { z } from 'zod';

// =============================================================================
// CREATE SCHEMA
// =============================================================================

/**
 * Schema for creating a new affiliate link (SitLink).
 *
 * Each link ties a creator to a product and generates a trackable
 * short URL. An optional custom alias can be specified for branded links.
 */
export const createLinkSchema = z.object({
  /** CUID of the product to create a link for */
  productId: z.string().cuid('Invalid product ID'),
  /** Optional custom alias for the short link (e.g., "my-fav-shoes") */
  customAlias: z
    .string()
    .min(3, 'Custom alias must be at least 3 characters')
    .max(30, 'Custom alias must be no more than 30 characters')
    .regex(
      /^[a-zA-Z0-9-]+$/,
      'Custom alias must only contain letters, numbers, and hyphens'
    )
    .optional(),
});

/** Inferred type for link creation input */
export type CreateLinkInput = z.infer<typeof createLinkSchema>;

// =============================================================================
// QUERY SCHEMA
// =============================================================================

/**
 * Schema for querying affiliate links with pagination and filtering.
 *
 * Supports filtering by creator and active status.
 */
export const linkQuerySchema = z.object({
  /** Filter links by creator ID */
  creatorId: z.string().cuid('Invalid creator ID').optional(),
  /** Page number for pagination (1-indexed) */
  page: z.coerce.number().int().positive().optional().default(1),
  /** Number of results per page */
  limit: z.coerce.number().int().positive().max(100, 'Limit cannot exceed 100').optional().default(20),
  /** Filter by active/inactive status */
  isActive: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional(),
});

/** Inferred type for link query input */
export type LinkQueryInput = z.infer<typeof linkQuerySchema>;
