/**
 * Brand Validation Schemas
 *
 * Zod schemas for brand CRUD operations.
 *
 * @module lib/validations/brand
 */

import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100).trim(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens')
    .trim(),
  registeredName: z.string().max(200).trim().optional().or(z.literal('')).or(z.null()),
  displayName: z.string().max(200).trim().optional().or(z.literal('')).or(z.null()),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')).or(z.null()),
  gstin: z
    .string()
    .max(15)
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.literal(''))
    .or(z.null()),
  contactPOC: z.string().max(100).trim().optional().or(z.literal('')).or(z.null()),
  contactPhone: z.string().max(15).trim().optional().or(z.literal('')).or(z.null()),
  isActive: z.boolean().optional().default(true),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens')
    .trim()
    .optional(),
  registeredName: z.string().max(200).trim().optional().or(z.literal('')).or(z.null()),
  displayName: z.string().max(200).trim().optional().or(z.literal('')).or(z.null()),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')).or(z.null()),
  gstin: z
    .string()
    .max(15)
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.literal(''))
    .or(z.null()),
  contactPOC: z.string().max(100).trim().optional().or(z.literal('')).or(z.null()),
  contactPhone: z.string().max(15).trim().optional().or(z.literal('')).or(z.null()),
  isActive: z.boolean().optional(),
});

export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
