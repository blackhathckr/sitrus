/**
 * User Role Constants for Sitrus Social Commerce Platform
 *
 * Defines the two platform roles (ADMIN, CREATOR) and their
 * display metadata including labels, descriptions, and Tailwind
 * color classes for badges.
 *
 * @module roles
 */

// =============================================================================
// ROLE ENUM
// =============================================================================

/**
 * User roles in the Sitrus platform.
 * Must match the UserRole enum in prisma/schema.prisma.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  CREATOR = 'CREATOR',
}

// =============================================================================
// ROLE DISPLAY INFO
// =============================================================================

/**
 * Display metadata for each role, including human-readable label,
 * description, and Tailwind CSS classes for badge styling.
 */
export const ROLE_INFO: Record<
  UserRole,
  {
    label: string;
    description: string;
    color: string;
  }
> = {
  [UserRole.ADMIN]: {
    label: 'Admin',
    description: 'Platform administrator with full system access',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  [UserRole.CREATOR]: {
    label: 'Creator',
    description: 'Content creator with storefront and affiliate link management',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the human-readable label for a role.
 *
 * @param role - The user role
 * @returns Display label (e.g. "Admin", "Creator")
 */
export function getRoleLabel(role: UserRole): string {
  return ROLE_INFO[role]?.label || role;
}

/**
 * Get the description for a role.
 *
 * @param role - The user role
 * @returns Description string explaining the role's purpose
 */
export function getRoleDescription(role: UserRole): string {
  return ROLE_INFO[role]?.description || '';
}

/**
 * Get the Tailwind CSS color classes for a role badge.
 *
 * @param role - The user role
 * @returns Tailwind class string for background, text, and border colors
 */
export function getRoleColor(role: UserRole): string {
  return ROLE_INFO[role]?.color || 'bg-gray-100 text-gray-800 border-gray-200';
}
