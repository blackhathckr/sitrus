/**
 * Session Utilities for Sitrus Social Commerce Platform
 *
 * Server-side helper functions for managing user sessions,
 * authentication checks, and role-based access control.
 *
 * @module session
 */

import { auth } from './auth-options';
import { UserRole } from '@prisma/client';

// =============================================================================
// SESSION RETRIEVAL
// =============================================================================

/**
 * Get the current authenticated user from the server-side session.
 *
 * @returns The session user object, or null if not authenticated
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

// =============================================================================
// AUTHENTICATION GUARDS
// =============================================================================

/**
 * Require authentication. Throws an error if the user is not signed in.
 *
 * @returns The authenticated user's session data
 * @throws {Error} If the user is not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized - Please sign in');
  }

  return user;
}

/**
 * Require the authenticated user to have one of the specified roles.
 *
 * @param allowedRoles - Array of roles that are permitted
 * @returns The authenticated user's session data
 * @throws {Error} If the user is not authenticated or lacks the required role
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden - Insufficient permissions');
  }

  return user;
}

// =============================================================================
// ROLE CHECKS
// =============================================================================

/**
 * Check if the current user has a specific role.
 *
 * @param role - The role to check against
 * @returns True if the user is authenticated and has the specified role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) return false;

  return user.role === role;
}

/**
 * Check if the current user has any of the specified roles.
 *
 * @param roles - Array of roles to check against
 * @returns True if the user is authenticated and has at least one of the roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) return false;

  return roles.includes(user.role);
}

/**
 * Check if the current user is an admin.
 *
 * @returns True if the user is authenticated and has the ADMIN role
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(UserRole.ADMIN);
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get the user's initials from their name.
 *
 * Extracts the first letter of the first two words in the name.
 * Falls back to the first two characters if the name is a single word.
 *
 * @param user - Object containing the user's name
 * @returns Uppercase initials (e.g. "JD" for "John Doe", "A" for "Admin")
 *
 * @example
 * getUserInitials({ name: 'John Doe' })     // "JD"
 * getUserInitials({ name: 'Alice' })         // "A"
 * getUserInitials({ name: 'Raj Kumar Singh'}) // "RK"
 */
export function getUserInitials(user: { name: string }): string {
  if (!user.name) return '';

  const words = user.name.trim().split(/\s+/);

  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  }

  return words[0].charAt(0).toUpperCase();
}
