/**
 * Next.js Middleware for Sitrus Social Commerce Platform
 *
 * Handles authentication and role-based routing using NextAuth v5's
 * auth() wrapper, which correctly reads the authjs session cookie.
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
import { auth } from '@/lib/auth/auth-options';

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

/** Routes that are accessible without authentication. */
const PUBLIC_ROUTES = ['/', '/login', '/register'];

/**
 * Known route prefixes that are NOT dynamic creator slugs.
 * Any single-segment path that does not match one of these is
 * treated as a public creator profile page (e.g. /jane-doe-1234).
 */
const KNOWN_ROUTE_PREFIXES = [
  'admin',
  'dashboard',
  'login',
  'register',
  'api',
  'r',
  'settings',
  'onboarding',
];

// =============================================================================
// MIDDLEWARE
// =============================================================================

export default auth((request) => {
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
  // 2. Get session from NextAuth v5 auth() wrapper
  // ---------------------------------------------------------------------------
  const session = request.auth;
  const userRole = session?.user?.role as string | undefined;

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
    if (session && (pathname === '/login' || pathname === '/register')) {
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
  if (!session) {
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
});

// =============================================================================
// MATCHER CONFIGURATION
// =============================================================================

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
