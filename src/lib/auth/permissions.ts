/**
 * RBAC Permission System for Sitrus Social Commerce Platform
 *
 * Defines role-based access control for all platform resources.
 * Two roles (ADMIN, CREATOR) with fine-grained CRUD permissions.
 *
 * - ADMIN: Full access to all resources
 * - CREATOR: Owns profile, links, collections; reads products; reads own
 *   clicks and earnings; no payout or user management
 *
 * @module permissions
 */

import { UserRole } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Resources managed by the Sitrus platform.
 */
export type Resource =
  | 'creators'
  | 'products'
  | 'brands'
  | 'links'
  | 'clicks'
  | 'collections'
  | 'earnings'
  | 'payouts'
  | 'analytics'
  | 'users'
  | 'integrations'
  | 'brand_orders';

/**
 * Standard CRUD actions.
 */
export type Action = 'create' | 'read' | 'update' | 'delete';

/**
 * Minimal user representation for permission checks.
 */
export interface UserWithRole {
  id: string;
  role: UserRole;
}

// =============================================================================
// PERMISSION MATRIX
// =============================================================================

/**
 * Permission matrix defining which actions each role can perform on each resource.
 *
 * ADMIN has full CRUD on every resource.
 * CREATOR has scoped access — own resources only (enforced at the service layer
 * via `isOwnResource`).
 */
const PERMISSION_MATRIX: Record<
  UserRole,
  Partial<Record<Resource, Action[]>>
> = {
  // Admin: Full CRUD on everything
  [UserRole.ADMIN]: {
    creators: ['create', 'read', 'update', 'delete'],
    products: ['create', 'read', 'update', 'delete'],
    brands: ['create', 'read', 'update', 'delete'],
    links: ['create', 'read', 'update', 'delete'],
    clicks: ['create', 'read', 'update', 'delete'],
    collections: ['create', 'read', 'update', 'delete'],
    earnings: ['create', 'read', 'update', 'delete'],
    payouts: ['create', 'read', 'update', 'delete'],
    analytics: ['read'],
    users: ['create', 'read', 'update', 'delete'],
    integrations: ['create', 'read', 'update', 'delete'],
    brand_orders: ['create', 'read', 'update', 'delete'],
  },

  // Creator: Own profile/links/collections, read products, read own clicks/earnings
  [UserRole.CREATOR]: {
    creators: ['read', 'update'],
    products: ['read'],
    brands: ['read'],
    links: ['create', 'read', 'update', 'delete'],
    clicks: ['read'],
    collections: ['create', 'read', 'update', 'delete'],
    earnings: ['read'],
    payouts: [],
    analytics: ['read'],
    users: [],
    integrations: [],
    brand_orders: ['read'],
  },
};

// =============================================================================
// PERMISSION CHECKS
// =============================================================================

/**
 * Check if a user has permission for a specific action on a resource.
 *
 * @param user - User object with id and role
 * @param resource - The resource being accessed
 * @param action - The CRUD action being attempted
 * @returns True if the user's role grants the requested permission
 *
 * @example
 * hasPermission({ id: '1', role: 'ADMIN' }, 'users', 'delete')   // true
 * hasPermission({ id: '1', role: 'CREATOR' }, 'users', 'delete') // false
 */
export function hasPermission(
  user: UserWithRole,
  resource: Resource,
  action: Action
): boolean {
  const rolePermissions = PERMISSION_MATRIX[user.role];

  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];

  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

/**
 * Require a specific permission. Throws an error if the user lacks access.
 *
 * @param user - User object with id and role
 * @param resource - The resource being accessed
 * @param action - The CRUD action being attempted
 * @throws {Error} If the user does not have the required permission
 *
 * @example
 * requirePermission(user, 'payouts', 'update'); // throws for CREATOR
 */
export function requirePermission(
  user: UserWithRole,
  resource: Resource,
  action: Action
): void {
  if (!hasPermission(user, resource, action)) {
    throw new Error(
      `Permission denied: ${user.role} cannot ${action} ${resource}`
    );
  }
}

/**
 * Get all permissions granted to a specific role.
 *
 * @param role - The user role to look up
 * @returns An object mapping each resource to its allowed actions
 *
 * @example
 * const perms = getRolePermissions(UserRole.CREATOR);
 * // { creators: ['read', 'update'], products: ['read'], ... }
 */
export function getRolePermissions(
  role: UserRole
): Partial<Record<Resource, Action[]>> {
  return PERMISSION_MATRIX[role] || {};
}

// =============================================================================
// OWNERSHIP CHECK
// =============================================================================

/**
 * Check if a user owns a resource by comparing user IDs.
 *
 * This is a simple identity check used at the service layer to enforce
 * that creators can only access their own data.
 *
 * @param userId - The authenticated user's ID
 * @param resourceOwnerId - The owner ID of the resource being accessed
 * @returns True if the user owns the resource
 *
 * @example
 * isOwnResource(session.user.id, link.creatorId) // true if same user
 */
export function isOwnResource(
  userId: string,
  resourceOwnerId: string
): boolean {
  return userId === resourceOwnerId;
}
