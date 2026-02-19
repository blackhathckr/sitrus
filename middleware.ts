/**
 * Next.js Middleware for Sitrus Social Commerce Platform
 *
 * Handles authentication and role-based routing at the Edge.
 * Uses getToken() with the correct NextAuth v5 cookie name
 * (authjs.session-token) to read JWT without importing Prisma.
 *
 * Route access rules:
 *   - Public:      /, /login, /register
 *   - Skip:        API routes, _next, static assets, /r/ (redirect links)
 *   - Dynamic:     Single-segment paths (creator [slug] pages) are public
 *   - Admin:       /admin/* requires ADMIN role
 *   - Creator:     /dashboard/* requires CREATOR role
 *   - Auth pages:  Authenticated users are redirected to their home
 *
 * @module middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

/** Routes that are accessible without authentication. */
const PUBLIC_ROUTES = ['/', '/login', '/register', '/admin-login'];

/**
 * Known route prefixes that are NOT dynamic creator slugs.
 * Any single-segment path that does not match one of these is
 * treated as a public creator profile page (e.g. /jane-doe-1234).
 */
const KNOWN_ROUTE_PREFIXES = [
  'admin',
  'admin-login',
  'dashboard',
  'login',
  'register',
  'api',
  'r',
  'settings',
  'onboarding',
];

// NextAuth v5 uses "authjs.session-token" (not "next-auth.session-token")
const COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

// =============================================================================
// MIDDLEWARE
// =============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------------------------
  // 1. Skip middleware for API routes, static files, and public assets
  // ---------------------------------------------------------------------------
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/r/')
  ) {
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // 2. Get JWT token (Edge-compatible, no DB call)
  //    Use the NextAuth v5 cookie name so the token is actually found.
  // ---------------------------------------------------------------------------
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: COOKIE_NAME,
    salt: COOKIE_NAME,
  });

  const userRole = token?.role as string | undefined;

  // ---------------------------------------------------------------------------
  // 3. Check if this is a public route
  // ---------------------------------------------------------------------------
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // ---------------------------------------------------------------------------
  // 4. Check if this is a dynamic [slug] route (single-segment, not known)
  //    Examples: /jane-doe-1234, /fashionista-9999
  //    Non-examples: /admin, /dashboard, /admin/users
  // ---------------------------------------------------------------------------
  const segments = pathname.split('/').filter(Boolean);
  const isDynamicSlugRoute =
    segments.length === 1 &&
    !KNOWN_ROUTE_PREFIXES.includes(segments[0]);

  // ---------------------------------------------------------------------------
  // 5. Allow public and dynamic slug routes through without auth
  // ---------------------------------------------------------------------------
  if (isPublicRoute || isDynamicSlugRoute) {
    // If authenticated user visits /login, redirect to their home
    if (token && (pathname === '/login' || pathname === '/register' || pathname === '/admin-login')) {
      if (userRole === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // 6. Redirect unauthenticated users to login
  // ---------------------------------------------------------------------------
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---------------------------------------------------------------------------
  // 7. Admin routes — require ADMIN role
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Creator dashboard routes — require CREATOR role
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/dashboard')) {
    if (userRole !== 'CREATOR') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

// =============================================================================
// MATCHER CONFIGURATION
// =============================================================================

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
