/**
 * NextAuth.js v5 API Route Handler
 *
 * Handles all authentication requests.
 */

import { handlers } from '@/lib/auth/auth-options';

export const { GET, POST } = handlers;
