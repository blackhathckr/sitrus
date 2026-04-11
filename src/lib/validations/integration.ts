/**
 * Brand Integration Validation Schemas
 *
 * Zod schemas for managing brand integrations (EasyEcom credentials).
 *
 * @module lib/validations/integration
 */

import { z } from 'zod';

/**
 * Schema for creating a new brand integration (connecting a brand to EasyEcom).
 */
export const createIntegrationSchema = z.object({
  brandId: z.string().min(1, 'Brand ID is required'),
  provider: z.enum(['easyecom'], { message: 'Provider must be "easyecom"' }),
  apiKey: z.string().min(1, 'API key is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
  locationKey: z.string().min(1, 'Location key is required'),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;

/**
 * Schema for updating an existing brand integration.
 */
export const updateIntegrationSchema = z.object({
  apiKey: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  locationKey: z.string().min(1).optional(),
  syncEnabled: z.boolean().optional(),
});

export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;
