/**
 * Click Analytics Validation Schemas
 *
 * Zod schemas for querying click tracking data with support
 * for date ranges, grouping dimensions, and filtering.
 *
 * @module lib/validations/click
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Available dimensions for grouping click analytics */
const CLICK_GROUP_BY_OPTIONS = ['date', 'country', 'device', 'referrer', 'browser'] as const;

// =============================================================================
// QUERY SCHEMA
// =============================================================================

/**
 * Schema for querying click analytics data.
 *
 * Supports filtering by link, creator, date range, and grouping
 * by various dimensions (date, country, device, referrer, browser)
 * for aggregated analytics views.
 */
export const clickQuerySchema = z.object({
  /** Filter clicks by a specific link ID */
  linkId: z.string().cuid('Invalid link ID').optional(),
  /** Filter clicks by creator ID (aggregates across all creator's links) */
  creatorId: z.string().cuid('Invalid creator ID').optional(),
  /** Start date for the query range (ISO 8601 format) */
  dateFrom: z
    .string()
    .datetime({ message: 'dateFrom must be a valid ISO 8601 date string' })
    .optional(),
  /** End date for the query range (ISO 8601 format) */
  dateTo: z
    .string()
    .datetime({ message: 'dateTo must be a valid ISO 8601 date string' })
    .optional(),
  /** Dimension to group results by for aggregation */
  groupBy: z.enum(CLICK_GROUP_BY_OPTIONS).optional(),
});

/** Inferred type for click query input */
export type ClickQueryInput = z.infer<typeof clickQuerySchema>;
