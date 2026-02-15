/**
 * Short Link Redirect & Click Tracking Route
 *
 * GET /api/r/[shortcode] - Resolve a SitLink, record the click, and redirect
 *
 * This is the CRITICAL redirect endpoint for affiliate short links.
 * When a user clicks a SitLink (e.g., sitrus.in/r/abc12345), this route:
 * 1. Looks up the link by shortCode or customAlias
 * 2. Parses the visitor's User-Agent for device/browser/OS info
 * 3. Creates a Click record with hashed IP for privacy
 * 4. Atomically increments the link's totalClicks counter
 * 5. Returns a 302 redirect to the affiliate URL
 *
 * @module api/r/[shortcode]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';

/** Route params shape for Next.js dynamic segments */
interface RouteParams {
  params: Promise<{ shortcode: string }>;
}

// =============================================================================
// USER-AGENT PARSING HELPERS
// =============================================================================

/**
 * Detect the device type from a User-Agent string.
 *
 * @param ua - Raw User-Agent header value
 * @returns 'mobile', 'tablet', or 'desktop'
 */
function parseDevice(ua: string): string {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Detect the browser name from a User-Agent string.
 * Order matters — more specific patterns must come before generic ones
 * (e.g., Edge and Opera include "Chrome" in their UA strings).
 *
 * @param ua - Raw User-Agent header value
 * @returns Browser name or 'Other'
 */
function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/ucbrowser/i.test(ua)) return 'UC Browser';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  if (/msie|trident/i.test(ua)) return 'Internet Explorer';
  return 'Other';
}

/**
 * Detect the operating system from a User-Agent string.
 *
 * @param ua - Raw User-Agent header value
 * @returns OS name or 'Other'
 */
function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/linux/i.test(ua)) return 'Linux';
  if (/cros/i.test(ua)) return 'ChromeOS';
  return 'Other';
}

/**
 * Hash an IP address using SHA-256 for privacy-preserving storage.
 * A static salt is mixed in so the hash cannot be trivially reversed.
 *
 * @param ip - The visitor's IP address
 * @returns A hex-encoded SHA-256 hash
 */
function hashIP(ip: string): string {
  return createHash('sha256')
    .update(`sitrus-click-salt:${ip}`)
    .digest('hex');
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * GET /api/r/[shortcode]
 *
 * Resolve a SitLink by its shortCode or customAlias, track the click,
 * and issue a 302 redirect to the affiliate URL.
 *
 * Click tracking data captured:
 * - Hashed IP address (for unique visitor estimation)
 * - User-Agent string
 * - Referrer header
 * - Parsed device type (mobile/tablet/desktop)
 * - Parsed browser name
 * - Parsed operating system
 *
 * @param request - Incoming request
 * @param params  - Route params containing the shortcode
 * @returns 302 redirect to affiliateUrl, or 404 if link not found
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { shortcode } = await params;

    // Look up the link by shortCode or customAlias — must be active
    const link = await prisma.link.findFirst({
      where: {
        OR: [
          { shortCode: shortcode },
          { customAlias: shortcode },
        ],
        isActive: true,
      },
      select: {
        id: true,
        affiliateUrl: true,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Extract visitor metadata from request headers
    const userAgent = request.headers.get('user-agent') || null;
    const referrer = request.headers.get('referer') || null;

    // Get the visitor IP — Next.js sets x-forwarded-for behind proxies
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '0.0.0.0';
    const ipHash = hashIP(ip);

    // Parse device, browser, and OS from User-Agent
    const device = userAgent ? parseDevice(userAgent) : null;
    const browser = userAgent ? parseBrowser(userAgent) : null;
    const os = userAgent ? parseOS(userAgent) : null;

    // Record the click and increment totalClicks atomically
    // Using Promise.all for parallel execution since these are independent writes
    await Promise.all([
      prisma.click.create({
        data: {
          linkId: link.id,
          ipHash,
          userAgent,
          referrer,
          device,
          browser,
          os,
        },
      }),
      prisma.link.update({
        where: { id: link.id },
        data: {
          totalClicks: { increment: 1 },
        },
      }),
    ]);

    // 302 redirect to the affiliate URL
    return NextResponse.redirect(link.affiliateUrl, { status: 302 });
  } catch (error) {
    console.error('Error processing redirect:', error);

    // Even on error, attempt to redirect if we have the URL to avoid
    // breaking the user experience. If we don't, return a 500.
    return NextResponse.json(
      { error: 'Failed to process redirect' },
      { status: 500 }
    );
  }
}
