/**
 * EasyEcom Inventory Sync Service
 *
 * Fetches current inventory levels from EasyEcom and updates stock
 * quantities on synced products in Sitrus.
 *
 * @module lib/integrations/easyecom/inventory-sync
 */

import { prisma } from '@/lib/db/prisma';
import { createEasyEcomClient } from './client';

/** Result returned after an inventory sync run */
export interface InventorySyncResult {
  totalFetched: number;
  updated: number;
  errors: number;
  durationMs: number;
}

/**
 * Sync inventory levels from EasyEcom for a given brand.
 *
 * - Fetches inventory from EasyEcom's inventory API
 * - Matches products by easyecomProductId (cp_id)
 * - Updates stockQuantity and inStock fields
 * - Updates lastInventorySync timestamp
 *
 * @param brandId - The Sitrus brand ID to sync inventory for
 * @returns Sync result summary
 */
export async function syncInventory(brandId: string): Promise<InventorySyncResult> {
  const startTime = Date.now();
  let updated = 0;
  let errors = 0;

  const client = await createEasyEcomClient(brandId);
  const inventoryItems = await client.getInventory();
  const totalFetched = inventoryItems.length;

  // Process in chunks
  const CHUNK_SIZE = 50;
  for (let i = 0; i < inventoryItems.length; i += CHUNK_SIZE) {
    const chunk = inventoryItems.slice(i, i + CHUNK_SIZE);

    const updatePromises = chunk.map(async (item) => {
      try {
        const cpId = String(item.cp_id);
        const availableQty = item.available_inventory;

        const result = await prisma.product.updateMany({
          where: {
            brandId,
            easyecomProductId: cpId,
          },
          data: {
            stockQuantity: availableQty,
            inStock: availableQty > 0,
          },
        });

        if (result.count > 0) updated++;
      } catch (err) {
        console.error(`[InventorySync] Error updating cp_id=${item.cp_id}:`, err);
        errors++;
      }
    });

    await Promise.all(updatePromises);
  }

  // Update sync timestamp
  await prisma.brandIntegration.update({
    where: { brandId },
    data: { lastInventorySync: new Date() },
  });

  return {
    totalFetched,
    updated,
    errors,
    durationMs: Date.now() - startTime,
  };
}
