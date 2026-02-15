/**
 * Enum Constants and Display Information for Sitrus Social Commerce Platform
 *
 * Centralized constants for all Prisma enums used across the application.
 * Each enum maps to a display info record containing label, Tailwind color
 * classes, and a Lucide icon name for consistent UI rendering.
 *
 * @module enums
 */

import {
  Marketplace,
  EarningStatus,
  PayoutStatus,
} from '@prisma/client';

// =============================================================================
// MARKETPLACE
// =============================================================================

/**
 * Display metadata for supported marketplace integrations.
 */
export const MARKETPLACE_INFO: Record<
  Marketplace,
  { label: string; color: string; icon: string }
> = {
  [Marketplace.MYNTRA]: {
    label: 'Myntra',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    icon: 'ShoppingBag',
  },
  [Marketplace.FLIPKART]: {
    label: 'Flipkart',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'Package',
  },
  [Marketplace.AJIO]: {
    label: 'Ajio',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: 'Shirt',
  },
  [Marketplace.AMAZON]: {
    label: 'Amazon',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'Store',
  },
};

// =============================================================================
// EARNING STATUS
// =============================================================================

/**
 * Display metadata for earning lifecycle statuses.
 */
export const EARNING_STATUS_INFO: Record<
  EarningStatus,
  { label: string; color: string; icon: string }
> = {
  [EarningStatus.PENDING]: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: 'Clock',
  },
  [EarningStatus.CONFIRMED]: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: 'CheckCircle',
  },
  [EarningStatus.PAID]: {
    label: 'Paid',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'Banknote',
  },
  [EarningStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'XCircle',
  },
};

// =============================================================================
// PAYOUT STATUS
// =============================================================================

/**
 * Display metadata for payout processing statuses.
 */
export const PAYOUT_STATUS_INFO: Record<
  PayoutStatus,
  { label: string; color: string; icon: string }
> = {
  [PayoutStatus.PENDING]: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: 'Clock',
  },
  [PayoutStatus.APPROVED]: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: 'CheckCircle',
  },
  [PayoutStatus.PROCESSING]: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'Loader',
  },
  [PayoutStatus.COMPLETED]: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: 'CheckCheck',
  },
  [PayoutStatus.REJECTED]: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'XCircle',
  },
};

// =============================================================================
// PRODUCT CATEGORIES
// =============================================================================

/**
 * Product categories available on the platform.
 *
 * Each category has a unique key, a human-readable label,
 * and a Lucide icon name for UI rendering.
 */
export const PRODUCT_CATEGORIES: {
  key: string;
  label: string;
  icon: string;
}[] = [
  { key: 'fashion', label: 'Fashion', icon: 'Shirt' },
  { key: 'beauty', label: 'Beauty', icon: 'Sparkles' },
  { key: 'electronics', label: 'Electronics', icon: 'Smartphone' },
  { key: 'home-living', label: 'Home & Living', icon: 'Home' },
  { key: 'fitness', label: 'Fitness', icon: 'Dumbbell' },
  { key: 'accessories', label: 'Accessories', icon: 'Watch' },
  { key: 'gadgets', label: 'Gadgets', icon: 'Cpu' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'Heart' },
];

/**
 * Lookup map for product categories by key.
 * Provides O(1) access to category metadata.
 */
export const PRODUCT_CATEGORY_MAP: Record<
  string,
  { label: string; icon: string }
> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((cat) => [cat.key, { label: cat.label, icon: cat.icon }])
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generic helper to retrieve display info for any enum value.
 *
 * Falls back to a default object if the status is not found in the map,
 * using the raw status string as the label.
 *
 * @param status - The enum value to look up
 * @param infoMap - The info record for the enum
 * @returns Display info with label, color, and icon
 *
 * @example
 * const info = getStatusInfo(EarningStatus.PENDING, EARNING_STATUS_INFO);
 * // { label: 'Pending', color: 'bg-yellow-100 ...', icon: 'Clock' }
 */
export function getStatusInfo<T extends string>(
  status: T,
  infoMap: Record<T, { label: string; color: string; icon: string }>
): { label: string; color: string; icon: string } {
  return infoMap[status] || { label: status, color: '', icon: '' };
}
