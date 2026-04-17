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

export interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  landing_site: string | null;
  referring_site: string | null;
  source_name: string;
  discount_codes: { code: string; amount: string; type: string }[];
  note_attributes: { name: string; value: string }[];
  customer: {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  line_items: {
    id: number;
    product_id: number;
    variant_id: number;
    sku: string | null;
    title: string;
    quantity: number;
    price: string;
  }[];
  cancelled_at: string | null;
  tags: string;
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}
