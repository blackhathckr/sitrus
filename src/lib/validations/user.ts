/**
 * User Validation Schemas
 *
 * Zod schemas for user-related operations including registration,
 * login, phone OTP verification, and profile updates.
 *
 * @module lib/validations/user
 */

import { z } from 'zod';
import { UserRole } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const BIO_MAX_LENGTH = 500;
const TAGLINE_MAX_LENGTH = 100;
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 30;

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/**
 * Email validation schema with normalization.
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

/**
 * Password validation schema requiring at least one letter and one number.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be less than ${PASSWORD_MAX_LENGTH} characters`)
  .regex(
    /^(?=.*[a-zA-Z])(?=.*\d)/,
    'Password must contain at least one letter and one number'
  );

/**
 * Name validation schema.
 */
export const nameSchema = z
  .string()
  .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
  .max(NAME_MAX_LENGTH, `Name must be less than ${NAME_MAX_LENGTH} characters`)
  .trim();

/**
 * Slug validation schema for URL-friendly identifiers.
 */
export const slugSchema = z
  .string()
  .min(SLUG_MIN_LENGTH, `Slug must be at least ${SLUG_MIN_LENGTH} characters`)
  .max(SLUG_MAX_LENGTH, `Slug must be no more than ${SLUG_MAX_LENGTH} characters`)
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    'Slug must be lowercase, alphanumeric with hyphens, and cannot start or end with a hyphen'
  );

/**
 * User role validation schema.
 */
export const userRoleSchema = z.nativeEnum(UserRole);

// =============================================================================
// AUTHENTICATION SCHEMAS
// =============================================================================

/**
 * Schema for user registration.
 *
 * Validates email format, name length, password strength (letter + number),
 * and ensures password confirmation matches.
 */
export const registerSchema = z
  .object({
    /** User's email address */
    email: emailSchema,
    /** User's full name */
    name: nameSchema,
    /** Password (min 8 chars, must contain a letter and a number) */
    password: passwordSchema,
    /** Must match the password field */
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** Inferred type for registration input */
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema for user login via email and password.
 */
export const loginSchema = z.object({
  /** User's email address */
  email: emailSchema,
  /** User's password */
  password: z.string().min(1, 'Password is required'),
});

/** Inferred type for login input */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for phone-based OTP authentication.
 *
 * Validates a 10-digit phone number and a 6-digit OTP code.
 */
export const phoneOtpSchema = z.object({
  /** 10-digit phone number */
  phone: z
    .string()
    .length(10, 'Phone number must be exactly 10 digits')
    .regex(/^\d{10}$/, 'Phone number must contain only digits'),
  /** 6-digit OTP code */
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

/** Inferred type for phone OTP input */
export type PhoneOtpInput = z.infer<typeof phoneOtpSchema>;

// =============================================================================
// PROFILE SCHEMAS
// =============================================================================

/**
 * Schema for updating a user's profile.
 *
 * All fields are optional; only provided fields will be updated.
 * Supports both basic user info and creator-specific storefront fields.
 */
export const updateProfileSchema = z.object({
  /** User's display name */
  name: nameSchema.optional(),
  /** Short biography (max 500 characters) */
  bio: z.string().max(BIO_MAX_LENGTH, `Bio must be at most ${BIO_MAX_LENGTH} characters`).optional(),
  /** Instagram handle without the @ prefix */
  instagramHandle: z
    .string()
    .regex(/^[a-zA-Z0-9._]+$/, 'Instagram handle must not include @ and only contain letters, numbers, dots, and underscores')
    .optional(),
  /** URL-friendly slug for the creator's storefront */
  slug: slugSchema.optional(),
  /** Display name shown on the storefront */
  displayName: z.string().max(NAME_MAX_LENGTH).trim().optional(),
  /** Short tagline (max 100 characters) */
  tagline: z
    .string()
    .max(TAGLINE_MAX_LENGTH, `Tagline must be at most ${TAGLINE_MAX_LENGTH} characters`)
    .optional(),
  /** URL for the user's avatar image */
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
  /** URL for the user's banner image */
  bannerUrl: z.string().url('Invalid banner URL').optional(),
  /** YouTube channel or video URL */
  youtubeUrl: z.string().url('Invalid YouTube URL').optional(),
  /** Twitter/X profile URL */
  twitterUrl: z.string().url('Invalid Twitter URL').optional(),
});

/** Inferred type for profile update input */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// =============================================================================
// ADMIN USER MANAGEMENT SCHEMAS
// =============================================================================

/**
 * Schema for creating a user (admin only).
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: userRoleSchema.optional().default('CREATOR'),
  isActive: z.boolean().optional().default(true),
});

/** Inferred type for user creation input */
export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Schema for updating a user (admin only).
 */
export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  image: z.string().url('Invalid image URL').optional().nullable(),
});

/** Inferred type for user update input */
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Schema for querying users with pagination and filtering.
 */
export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  role: userRoleSchema.optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  sortBy: z
    .enum(['createdAt', 'name', 'email', 'role', 'lastLogin'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/** Inferred type for user query input */
export type UserQueryInput = z.infer<typeof userQuerySchema>;

// =============================================================================
// PASSWORD SCHEMAS
// =============================================================================

/**
 * Schema for requesting a password reset.
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/** Inferred type for password reset request */
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

/**
 * Schema for completing a password reset.
 */
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** Inferred type for password reset input */
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

/**
 * Schema for changing the current password.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/** Inferred type for change password input */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates and parses user registration data.
 * @throws {ZodError} If validation fails
 */
export function validateRegister(data: unknown): RegisterInput {
  return registerSchema.parse(data);
}

/**
 * Validates and parses user login data.
 * @throws {ZodError} If validation fails
 */
export function validateLogin(data: unknown): LoginInput {
  return loginSchema.parse(data);
}

/**
 * Validates and parses profile update data.
 * @throws {ZodError} If validation fails
 */
export function validateProfileUpdate(data: unknown): UpdateProfileInput {
  return updateProfileSchema.parse(data);
}

/**
 * Validates and parses user creation data (admin).
 * @throws {ZodError} If validation fails
 */
export function validateCreateUser(data: unknown): CreateUserInput {
  return createUserSchema.parse(data);
}

/**
 * Validates and parses user update data (admin).
 * @throws {ZodError} If validation fails
 */
export function validateUpdateUser(data: unknown): UpdateUserInput {
  return updateUserSchema.parse(data);
}
