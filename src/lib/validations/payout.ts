/**
 * Payout Validation Schemas
 *
 * Zod schemas for payout operations including requesting payouts,
 * approving payouts (admin), and querying payout history.
 *
 * @module lib/validations/payout
 */

import { z } from 'zod';
import { PayoutStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum payout amount in INR */
const MIN_PAYOUT_AMOUNT = 100;

// =============================================================================
// CREATE SCHEMA
// =============================================================================

/**
 * Schema for requesting a new payout.
 *
 * Creators can request payouts once their confirmed earnings
 * reach the minimum threshold of INR 100.
 */
export const createPayoutSchema = z.object({
  /** Payout amount in INR (minimum 100) */
  amount: z
    .number()
    .positive('Amount must be a positive number')
    .min(MIN_PAYOUT_AMOUNT, `Minimum payout amount is INR ${MIN_PAYOUT_AMOUNT}`),
});

/** Inferred type for payout creation input */
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;

// =============================================================================
// APPROVE SCHEMA
// =============================================================================

/**
 * Schema for approving a payout request (admin only).
 *
 * Optionally accepts a transaction reference number for record-keeping.
 */
export const approvePayoutSchema = z.object({
  /** Optional transaction reference or ID from the payment provider */
  reference: z.string().trim().optional(),
});

/** Inferred type for payout approval input */
export type ApprovePayoutInput = z.infer<typeof approvePayoutSchema>;

// =============================================================================
// QUERY SCHEMA
// =============================================================================

/**
 * Schema for querying payouts with pagination and filtering.
 *
 * Supports filtering by creator and payout status
 * (PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED).
 */
export const payoutQuerySchema = z.object({
  /** Filter payouts by creator ID */
  creatorId: z.string().cuid('Invalid creator ID').optional(),
  /** Filter by payout status */
  status: z.nativeEnum(PayoutStatus).optional(),
  /** Page number for pagination (1-indexed) */
  page: z.coerce.number().int().positive().optional().default(1),
  /** Number of results per page */
  limit: z.coerce.number().int().positive().max(100, 'Limit cannot exceed 100').optional().default(20),
});

/** Inferred type for payout query input */
export type PayoutQueryInput = z.infer<typeof payoutQuerySchema>;
