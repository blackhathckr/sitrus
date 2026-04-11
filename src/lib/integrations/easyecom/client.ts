/**
 * EasyEcom API Client
 *
 * Handles authentication, product retrieval, inventory fetching, and order
 * queries against the EasyEcom REST API. Credentials are decrypted from
 * the BrandIntegration record on instantiation and never persisted in plaintext.
 *
 * Features retry with exponential backoff for rate-limited (429) and
 * transient server errors (5xx).
 *
 * @module lib/integrations/easyecom/client
 */

import { decrypt, encrypt } from '@/lib/crypto/encryption';
import { prisma } from '@/lib/db/prisma';
import type {
  EasyEcomAuthResponse,
  EasyEcomProduct,
  EasyEcomProductResponse,
  EasyEcomProductCountResponse,
  EasyEcomInventoryItem,
  EasyEcomInventoryResponse,
  EasyEcomOrder,
  EasyEcomOrderResponse,
} from './types';

const BASE_URL = 'https://api.easyecom.io';

// Token refresh buffer — renew if expiring within 7 days
const TOKEN_REFRESH_BUFFER_MS = 7 * 24 * 60 * 60 * 1000;

// Retry config
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface BrandIntegrationRecord {
  id: string;
  apiKeyEnc: string;
  emailEnc: string;
  passwordEnc: string;
  locationKey: string;
  jwtTokenEnc: string | null;
  tokenExpiresAt: Date | null;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EasyEcomClient {
  private apiKey: string;
  private email: string;
  private password: string;
  private locationKey: string;
  private integrationId: string;
  private cachedToken: string | null;
  private tokenExpiresAt: Date | null;

  constructor(integration: BrandIntegrationRecord) {
    this.integrationId = integration.id;
    this.apiKey = decrypt(integration.apiKeyEnc);
    this.email = decrypt(integration.emailEnc);
    this.password = decrypt(integration.passwordEnc);
    this.locationKey = integration.locationKey;
    this.cachedToken = integration.jwtTokenEnc ? decrypt(integration.jwtTokenEnc) : null;
    this.tokenExpiresAt = integration.tokenExpiresAt;
  }

  // ===========================================================================
  // AUTH
  // ===========================================================================

  /**
   * Get a valid JWT token, refreshing if expired or expiring soon.
   */
  private async getToken(): Promise<string> {
    // Use cached token if still valid
    if (
      this.cachedToken &&
      this.tokenExpiresAt &&
      this.tokenExpiresAt.getTime() - Date.now() > TOKEN_REFRESH_BUFFER_MS
    ) {
      return this.cachedToken;
    }

    // Authenticate to get a new token
    const response = await fetch(`${BASE_URL}/access/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        email: this.email,
        password: this.password,
        location_key: this.locationKey,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`EasyEcom auth failed (${response.status}): ${text}`);
    }

    const result: EasyEcomAuthResponse = await response.json();
    const { jwt_token, expires_in } = result.data.token;

    this.cachedToken = jwt_token;
    this.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Persist encrypted token to DB for reuse across requests
    await prisma.brandIntegration.update({
      where: { id: this.integrationId },
      data: {
        jwtTokenEnc: encrypt(jwt_token),
        tokenExpiresAt: this.tokenExpiresAt,
      },
    });

    return jwt_token;
  }

  // ===========================================================================
  // RETRY LOGIC
  // ===========================================================================

  /**
   * Execute a fetch with retry on 429 (rate limit) and 5xx (server errors).
   * Uses exponential backoff with jitter.
   */
  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url, init);

      // Success or client error (not rate limit) — return immediately
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }

      // Rate limited or server error — retry with backoff
      if (response.status === 429 || response.status >= 500) {
        if (attempt === MAX_RETRIES) {
          const text = await response.text();
          throw new Error(`EasyEcom API error (${response.status}) after ${MAX_RETRIES} retries: ${text}`);
        }

        // Check Retry-After header
        const retryAfter = response.headers.get('Retry-After');
        let waitMs: number;

        if (retryAfter) {
          waitMs = parseInt(retryAfter, 10) * 1000;
        } else {
          // Exponential backoff with jitter
          waitMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 500;
        }

        console.warn(`[EasyEcom] ${response.status} on attempt ${attempt + 1}, retrying in ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      // Other errors — throw
      const text = await response.text();
      throw new Error(`EasyEcom API error (${response.status}): ${text}`);
    }

    throw lastError || new Error('EasyEcom request failed after retries');
  }

  // ===========================================================================
  // REQUEST
  // ===========================================================================

  /**
   * Make an authenticated request to the EasyEcom API with retry.
   */
  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string> }
  ): Promise<T> {
    const token = await this.getToken();

    const url = new URL(`${BASE_URL}${path}`);
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await this.fetchWithRetry(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Authorization': `Bearer ${token}`,
      },
      ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`EasyEcom API error ${method} ${path} (${response.status}): ${text}`);
    }

    return response.json();
  }

  /**
   * Make an authenticated fetch to a full URL (for cursor pagination) with retry.
   */
  private async authenticatedFetch(fullUrl: string): Promise<Response> {
    const token = await this.getToken();
    return this.fetchWithRetry(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // ===========================================================================
  // PRODUCTS
  // ===========================================================================

  /**
   * Fetch the total number of master products.
   */
  async getProductCount(): Promise<number> {
    const result = await this.request<EasyEcomProductCountResponse>(
      'GET',
      '/Products/GetProductMastersCount'
    );
    return result.count;
  }

  /**
   * Fetch a page of master products. EasyEcom uses cursor-based pagination.
   *
   * @param cursorUrl - Full URL for the next page (from previous response), or null for first page
   * @returns Products array and next cursor URL
   */
  async getProducts(cursorUrl?: string | null): Promise<{
    products: EasyEcomProduct[];
    nextUrl: string | null;
  }> {
    if (cursorUrl) {
      // nextUrl from EasyEcom is a relative path — prepend base URL
      const fullUrl = cursorUrl.startsWith('http') ? cursorUrl : `${BASE_URL}${cursorUrl}`;
      const response = await this.authenticatedFetch(fullUrl);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`EasyEcom API error GET products cursor (${response.status}): ${text}`);
      }

      const result: EasyEcomProductResponse = await response.json();
      return {
        products: result.data || [],
        nextUrl: result.nextUrl || null,
      };
    }

    const result = await this.request<EasyEcomProductResponse>(
      'GET',
      '/Products/GetProductMaster'
    );

    return {
      products: result.data || [],
      nextUrl: result.nextUrl || null,
    };
  }

  /**
   * Fetch ALL products by paginating through all pages.
   * Yields batches for memory-efficient processing.
   */
  async *getAllProducts(): AsyncGenerator<EasyEcomProduct[]> {
    let nextUrl: string | null = null;
    let isFirstPage = true;

    while (isFirstPage || nextUrl) {
      const result = await this.getProducts(isFirstPage ? null : nextUrl);
      isFirstPage = false;

      if (result.products.length === 0) break;

      yield result.products;
      nextUrl = result.nextUrl;
    }
  }

  // ===========================================================================
  // INVENTORY
  // ===========================================================================

  /**
   * Fetch inventory details for all products.
   */
  async getInventory(): Promise<EasyEcomInventoryItem[]> {
    const result = await this.request<EasyEcomInventoryResponse>(
      'GET',
      '/getInventoryDetailsV3'
    );
    return result.data || [];
  }

  // ===========================================================================
  // ORDERS
  // ===========================================================================

  /**
   * Fetch orders within a date range.
   *
   * @param from - Start date (ISO string)
   * @param to - End date (ISO string)
   */
  async getOrders(from: string, to: string): Promise<EasyEcomOrder[]> {
    const allOrders: EasyEcomOrder[] = [];
    let nextUrl: string | null = null;
    let isFirstPage = true;

    while (isFirstPage || nextUrl) {
      let result: EasyEcomOrderResponse;

      if (!isFirstPage && nextUrl) {
        // nextUrl from EasyEcom is a relative path — prepend base URL
        const fullUrl = nextUrl.startsWith('http') ? nextUrl : `${BASE_URL}${nextUrl}`;
        const response = await this.authenticatedFetch(fullUrl);
        if (!response.ok) break;
        result = await response.json();
      } else {
        result = await this.request<EasyEcomOrderResponse>(
          'GET',
          '/orders/V2/getAllOrders',
          {
            params: {
              start_date: from,
              end_date: to,
            },
          }
        );
      }

      isFirstPage = false;

      if (!result.data || result.data.length === 0) break;

      allOrders.push(...result.data);
      nextUrl = result.nextUrl || null;
    }

    return allOrders;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an EasyEcom client from a brand ID. Fetches the integration record
 * from the database, decrypts credentials, and returns a ready-to-use client.
 *
 * @param brandId - The brand's ID in Sitrus
 * @throws {Error} If no integration exists for the brand
 */
export async function createEasyEcomClient(brandId: string): Promise<EasyEcomClient> {
  const integration = await prisma.brandIntegration.findUnique({
    where: { brandId },
    select: {
      id: true,
      apiKeyEnc: true,
      emailEnc: true,
      passwordEnc: true,
      locationKey: true,
      jwtTokenEnc: true,
      tokenExpiresAt: true,
    },
  });

  if (!integration) {
    throw new Error(`No EasyEcom integration found for brand ${brandId}`);
  }

  return new EasyEcomClient(integration);
}
