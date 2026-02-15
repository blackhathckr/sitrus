/**
 * Earning Validation Schemas
 *
 * Zod schemas for querying creator earnings with filtering
 * by creator, period, status, and pagination support.
 *
 * @module lib/validations/earning
 */

import { z } from 'zod';
import { EarningStatus } from '@prisma/client';

// =============================================================================
// QUERY SCHEMA
// =============================================================================

/**
 * Schema for querying earnings with pagination and filtering.
 *
 * Supports filtering by creator, earning period (e.g., "2026-02"),
 * and earning status (PENDING, CONFIRMED, PAID, CANCELLED).
 */
export const earningQuerySchema = z.object({
  /** Filter earnings by creator ID */
  creatorId: z.string().cuid('Invalid creator ID').optional(),
  /** Filter by earning period (e.g., "2026-02" or "2026-W06") */
  period: z.string().optional(),
  /** Filter by earning status */
  status: z.nativeEnum(EarningStatus).optional(),
  /** Page number for pagination (1-indexed) */
  page: z.coerce.number().int().positive().optional().default(1),
  /** Number of results per page */
  limit: z.coerce.number().int().positive().max(100, 'Limit cannot exceed 100').optional().default(20),
});

/** Inferred type for earning query input */
export type EarningQueryInput = z.infer<typeof earningQuerySchema>;

// =============================================================================
// CREATE SCHEMA
// =============================================================================

/**
 * Schema for creating a new earning record (admin only).
 */
export const createEarningSchema = z.object({
  creatorId: z.string().cuid('Invalid creator ID'),
  linkId: z.string().cuid('Invalid link ID').optional(),
  amount: z.number().positive('Amount must be positive'),
  status: z.nativeEnum(EarningStatus).optional().default('PENDING'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format').optional(),
  description: z.string().max(500).optional(),
});

export type CreateEarningInput = z.infer<typeof createEarningSchema>;

// =============================================================================
// UPDATE SCHEMA
// =============================================================================

/**
 * Schema for updating an earning's status (admin only).
 */
export const updateEarningSchema = z.object({
  status: z.nativeEnum(EarningStatus),
});

export type UpdateEarningInput = z.infer<typeof updateEarningSchema>;
