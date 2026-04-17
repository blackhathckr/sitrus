/**
 * Shopify Admin REST API Client
 *
 * Lightweight client for fetching products from Shopify Admin API.
 * Uses client_credentials OAuth flow with auto-refresh (tokens expire every 24h).
 *
 * @module lib/integrations/shopify/client
 */

import { decrypt, encrypt } from '@/lib/crypto/encryption';
import { prisma } from '@/lib/db/prisma';
import type { ShopifyProduct, ShopifyProductsResponse, ShopifyOrder, ShopifyOrdersResponse } from './types';

const API_VERSION = '2024-01';
const MAX_PER_PAGE = 250;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const TOKEN_REFRESH_BUFFER_MS = 60 * 60 * 1000; // Refresh 1h before expiry

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ShopifyClient {
  private domain: string;
  private accessToken: string;
  private clientId: string | null;
  private clientSecret: string | null;
  private tokenExpiry: Date | null;
  private integrationId: string;

  constructor(opts: {
    domain: string;
    accessToken: string;
    clientId: string | null;
    clientSecret: string | null;
    tokenExpiry: Date | null;
    integrationId: string;
  }) {
    this.domain = opts.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.accessToken = opts.accessToken;
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.tokenExpiry = opts.tokenExpiry;
    this.integrationId = opts.integrationId;
  }

  /**
   * Get a valid access token, refreshing via client_credentials if expired.
   */
  private async getToken(): Promise<string> {
    if (
      this.accessToken &&
      this.tokenExpiry &&
      this.tokenExpiry.getTime() - Date.now() > TOKEN_REFRESH_BUFFER_MS
    ) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Shopify client credentials not configured — cannot refresh token');
    }

    const response = await fetch(
      `https://${this.domain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify token refresh failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

    // Persist new token
    await prisma.brandIntegration.update({
      where: { id: this.integrationId },
      data: {
        shopifyTokenEnc: encrypt(this.accessToken),
        shopifyTokenExpiry: this.tokenExpiry,
      },
    });

    return this.accessToken;
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    const token = await this.getToken();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) return response;

      if (response.status === 429 || response.status >= 500) {
        if (attempt === MAX_RETRIES) {
          const text = await response.text();
          throw new Error(`Shopify API error (${response.status}) after ${MAX_RETRIES} retries: ${text}`);
        }
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter
          ? parseFloat(retryAfter) * 1000
          : INITIAL_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 500;
        await sleep(waitMs);
        continue;
      }

      const text = await response.text();
      throw new Error(`Shopify API error (${response.status}): ${text}`);
    }

    throw new Error('Shopify request failed after retries');
  }

  /**
   * Fetch all products from Shopify using Link header pagination.
   */
  async getAllProducts(): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let url: string | null = `https://${this.domain}/admin/api/${API_VERSION}/products.json?limit=${MAX_PER_PAGE}&fields=id,title,handle,status,variants`;

    while (url) {
      const response = await this.fetchWithRetry(url);
      const data: ShopifyProductsResponse = await response.json();
      allProducts.push(...data.products);

      const linkHeader = response.headers.get('Link') || response.headers.get('link');
      url = null;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          url = nextMatch[1];
        }
      }
    }

    return allProducts;
  }

  /**
   * Register webhook subscriptions for order events.
   * Idempotent — checks existing webhooks and only creates missing ones.
   */
  async registerWebhooks(baseUrl: string): Promise<{ created: string[]; existing: string[] }> {
    const topics = ['orders/create', 'orders/updated'];
    const created: string[] = [];
    const existing: string[] = [];

    // Get existing webhooks
    const listRes = await this.fetchWithRetry(
      `https://${this.domain}/admin/api/${API_VERSION}/webhooks.json?fields=id,topic,address`
    );
    const listData = await listRes.json();
    const currentWebhooks: { id: number; topic: string; address: string }[] = listData.webhooks || [];

    const webhookUrl = `${baseUrl}/api/webhooks/shopify`;

    for (const topic of topics) {
      const alreadyRegistered = currentWebhooks.find(
        (w) => w.topic === topic && w.address === webhookUrl
      );

      if (alreadyRegistered) {
        existing.push(topic);
        continue;
      }

      const token = await this.getToken();
      const res = await fetch(
        `https://${this.domain}/admin/api/${API_VERSION}/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookUrl,
              format: 'json',
            },
          }),
        }
      );

      if (res.ok) {
        created.push(topic);
      } else {
        const text = await res.text();
        console.error(`[Shopify] Failed to register webhook ${topic}: ${res.status} ${text}`);
      }
    }

    return { created, existing };
  }

  /**
   * Fetch orders from Shopify within a date range, with Link header pagination.
   */
  async getOrders(sinceDate: string): Promise<ShopifyOrder[]> {
    const allOrders: ShopifyOrder[] = [];
    let url: string | null = `https://${this.domain}/admin/api/${API_VERSION}/orders.json?status=any&limit=${MAX_PER_PAGE}&created_at_min=${encodeURIComponent(sinceDate)}&fields=id,name,order_number,created_at,financial_status,fulfillment_status,total_price,subtotal_price,total_discounts,landing_site,referring_site,source_name,discount_codes,note_attributes,customer,line_items,cancelled_at,tags`;

    while (url) {
      const response = await this.fetchWithRetry(url);
      const data: ShopifyOrdersResponse = await response.json();
      allOrders.push(...data.orders);

      const linkHeader = response.headers.get('Link') || response.headers.get('link');
      url = null;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          url = nextMatch[1];
        }
      }
    }

    return allOrders;
  }
}

/**
 * Create a Shopify client from a brand ID.
 */
export async function createShopifyClient(brandId: string): Promise<ShopifyClient> {
  const integration = await prisma.brandIntegration.findUnique({
    where: { brandId },
    select: {
      id: true,
      shopifyTokenEnc: true,
      shopifyDomain: true,
      shopifyClientId: true,
      shopifyClientSecEnc: true,
      shopifyTokenExpiry: true,
    },
  });

  if (!integration?.shopifyDomain) {
    throw new Error(`No Shopify credentials found for brand ${brandId}`);
  }

  if (!integration.shopifyClientId || !integration.shopifyClientSecEnc) {
    throw new Error(`Shopify client credentials not configured for brand ${brandId}`);
  }

  const clientSecret = decrypt(integration.shopifyClientSecEnc);

  // If no token or expired, get a fresh one
  let accessToken = integration.shopifyTokenEnc ? decrypt(integration.shopifyTokenEnc) : '';
  const tokenExpiry = integration.shopifyTokenExpiry;

  return new ShopifyClient({
    domain: integration.shopifyDomain,
    accessToken,
    clientId: integration.shopifyClientId,
    clientSecret,
    tokenExpiry,
    integrationId: integration.id,
  });
}
