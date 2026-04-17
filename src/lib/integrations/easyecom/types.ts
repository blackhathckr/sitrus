/**
 * EasyEcom API Type Definitions
 *
 * TypeScript interfaces for EasyEcom API request/response shapes.
 *
 * @module lib/integrations/easyecom/types
 */

// =============================================================================
// AUTH
// =============================================================================

export interface EasyEcomAuthResponse {
  data: {
    companyname: string;
    userName: string;
    token: {
      jwt_token: string;
      token_type: string;
      expires_in: number; // seconds
    };
  };
  message: string | null;
}

// =============================================================================
// PRODUCTS
// =============================================================================

export interface EasyEcomProduct {
  cp_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  description: string | null;
  active: number; // 0 or 1
  created_at: string;
  updated_at: string;
  inventory: number;
  product_type: string;
  brand: string;
  colour: string | null;
  category_id: number;
  brand_id: number;
  category_name: string;
  company_name: string;
  c_id: number;
  height: number;
  length: number;
  width: number;
  weight: number;
  cost: number;
  mrp: number;
  size: string | null;
  model_no: string;
  EANUPC: string | null;
  hsn_code: string | null;
  product_image_url: string | null;
  cp_inventory: number;
  tax_rule_name: string | null;
  tax_rate: number;
  Flammable: number;
}

export interface EasyEcomProductResponse {
  data: EasyEcomProduct[];
  message: string | null;
  nextUrl?: string | null;
}

export interface EasyEcomProductCountResponse {
  count: number;
}

// =============================================================================
// INVENTORY
// =============================================================================

export interface EasyEcomInventoryItem {
  sku: string;
  cp_id: number;
  product_name: string;
  available_inventory: number;
  inventory_in_hand: number;
  blocked_inventory: number;
  location_wise_inventory?: Array<{
    location_id: number;
    location_name: string;
    available_inventory: number;
  }>;
}

export interface EasyEcomInventoryResponse {
  data: EasyEcomInventoryItem[];
  message: string | null;
}

// =============================================================================
// ORDERS
// =============================================================================

export interface EasyEcomOrderItem {
  sku: string;
  product_name: string;
  selling_price: number;
  qty: number;
  discount: number;
  tax_value: number;
  cp_id: number;
}

export interface EasyEcomOrder {
  order_id: number;
  invoice_id: string;
  reference_code: string;
  marketplace: string;
  marketplace_name: string;
  order_status: string;
  payment_mode: string;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  updated_at: string;
  source: string | null;
  sub_order_items: EasyEcomOrderItem[];
  // UTM / custom fields may be in additional_info or custom fields
  additional_info?: Record<string, string>;
  custom_fields?: Record<string, string>;
}

export interface EasyEcomOrderResponse {
  data: {
    orders: EasyEcomOrder[];
    nextUrl?: string | null;
  };
  message: string | null;
}

export interface EasyEcomOrderDetailResponse {
  data: EasyEcomOrder;
  message: string | null;
}

// =============================================================================
// WEBHOOK PAYLOADS
// =============================================================================

export interface EasyEcomWebhookOrderPayload {
  event: string;
  data: EasyEcomOrder;
}

export interface EasyEcomWebhookInventoryPayload {
  event: string;
  data: {
    sku: string;
    cp_id: number;
    available_inventory: number;
  };
}
