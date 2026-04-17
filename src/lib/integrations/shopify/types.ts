/**
 * Shopify Admin REST API Type Definitions
 *
 * @module lib/integrations/shopify/types
 */

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string | null;
  inventory_quantity: number;
  price: string;
  compare_at_price: string | null;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  variants: ShopifyVariant[];
}

export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}
