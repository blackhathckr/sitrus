/**
 * Product Validation Schemas
 *
 * Zod schemas for product-related operations including searching
 * the product catalog and creating new product entries.
 *
 * @module lib/validations/product
 */

import { z } from 'zod';
import { Marketplace } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Allowed sort options for product search results */
const PRODUCT_SORT_OPTIONS = ['price_asc', 'price_desc', 'rating', 'newest'] as const;

// =============================================================================
// SEARCH SCHEMA
// =============================================================================

/**
 * Schema for searching and filtering products in the catalog.
 *
 * Supports filtering by category, marketplace, price range, brand,
 * and text search with pagination and sorting.
 */
export const productSearchSchema = z.object({
  /** Filter by product category */
  category: z.string().optional(),
  /** Filter by marketplace source */
  marketplace: z.nativeEnum(Marketplace).optional(),
  /** Free-text search query */
  search: z.string().optional(),
  /** Minimum price filter (inclusive) */
  minPrice: z.coerce.number().nonnegative('Minimum price must be non-negative').optional(),
  /** Maximum price filter (inclusive) */
  maxPrice: z.coerce.number().positive('Maximum price must be positive').optional(),
  /** Filter by brand name */
  brand: z.string().optional(),
  /** Page number for pagination (1-indexed) */
  page: z.coerce.number().int().positive().optional().default(1),
  /** Number of results per page (max 100) */
  limit: z.coerce.number().int().positive().max(100, 'Limit cannot exceed 100').optional().default(20),
  /** Sort order for results */
  sortBy: z.enum(PRODUCT_SORT_OPTIONS).optional(),
});

/** Inferred type for product search input */
export type ProductSearchInput = z.infer<typeof productSearchSchema>;

// =============================================================================
// CREATE SCHEMA
// =============================================================================

/**
 * Schema for creating a new product entry in the catalog.
 *
 * Products are sourced from external marketplaces (Myntra, Flipkart, Ajio, Amazon)
 * and stored locally with affiliate metadata.
 */
export const createProductSchema = z.object({
  /** Product title */
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters').trim(),
  /** Detailed product description */
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional(),
  /** Primary product image URL */
  imageUrl: z.string().url('Invalid image URL'),
  /** Additional product image URLs */
  images: z.array(z.string().url('Invalid image URL')).optional(),
  /** Current selling price */
  price: z.number().positive('Price must be positive'),
  /** Original price before discount (for showing savings) */
  originalPrice: z.number().positive('Original price must be positive').optional(),
  /** URL to the product on its source marketplace */
  sourceUrl: z.string().url('Invalid source URL'),
  /** Marketplace where the product is listed */
  marketplace: z.nativeEnum(Marketplace),
  /** Primary product category */
  category: z.string().min(1, 'Category is required').trim(),
  /** Secondary category for finer classification */
  subCategory: z.string().trim().optional(),
  /** Brand name */
  brand: z.string().trim().optional(),
  /** Average customer rating (0-5) */
  rating: z.number().min(0).max(5, 'Rating must be between 0 and 5').optional(),
  /** Number of customer reviews */
  reviewCount: z.number().int().nonnegative().optional(),
  /** Commission rate for affiliate earnings (0-100%) */
  commissionRate: z.number().min(0).max(100, 'Commission rate must be between 0 and 100').optional(),
  /** Base URL for generating affiliate links */
  affiliateBaseUrl: z.string().url('Invalid affiliate base URL').optional(),
});

/** Inferred type for product creation input */
export type CreateProductInput = z.infer<typeof createProductSchema>;
