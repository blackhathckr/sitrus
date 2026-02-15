/**
 * NextAuth.js v5 Configuration for Sitrus Social Commerce Platform
 *
 * Configures authentication providers, callbacks, and session handling.
 * Supports three authentication flows:
 *   - Google OAuth for creator signup/login
 *   - Email/password credentials for admin login
 *   - Phone OTP (mock) for creator login
 *
 * @module auth-options
 */

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@prisma/client';

// =============================================================================
// TYPE EXTENSIONS
// =============================================================================

/**
 * Extend NextAuth types to include Sitrus-specific user fields.
 * Session carries id, email, name, role, image, and creator slug.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      image?: string | null;
      slug?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    image?: string | null;
    slug?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    image?: string | null;
    slug?: string | null;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a URL-safe slug from a display name.
 *
 * Converts to lowercase, replaces spaces with hyphens, strips
 * non-alphanumeric characters, and appends a random 4-digit suffix
 * to ensure uniqueness.
 *
 * @param name - The display name to slugify
 * @returns A unique slug string (e.g. "john-doe-4829")
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

/**
 * Find or create a CreatorProfile for a given user.
 *
 * If the user already has a profile, returns its slug.
 * Otherwise, creates one with a generated slug and returns it.
 *
 * @param userId - The user's database ID
 * @param name - The user's display name (used for slug generation)
 * @returns The creator profile's slug
 */
async function ensureCreatorProfile(
  userId: string,
  name: string
): Promise<string> {
  const existing = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { slug: true },
  });

  if (existing) {
    return existing.slug;
  }

  const slug = generateSlug(name);

  const profile = await prisma.creatorProfile.create({
    data: {
      userId,
      slug,
      displayName: name,
    },
  });

  return profile.slug;
}

// =============================================================================
// NEXTAUTH CONFIGURATION
// =============================================================================

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Trust the host header on Vercel (required for cookie domain resolution)
  trustHost: true,

  // ---------------------------------------------------------------------------
  // Session strategy
  // ---------------------------------------------------------------------------
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // ---------------------------------------------------------------------------
  // Authentication providers
  // ---------------------------------------------------------------------------
  providers: [
    /**
     * Google OAuth Provider
     *
     * Used for creator signup and login. On first sign-in the JWT callback
     * auto-creates a User record and an associated CreatorProfile.
     */
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    /**
     * Credentials Provider — Admin Email/Password
     *
     * Authenticates admin users with email and bcrypt-hashed password.
     * Validates the account exists, is active, and the password matches.
     */
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'admin@sitrus.in',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              creatorProfile: { select: { slug: true } },
            },
          });

          if (!user) {
            throw new Error('Invalid email or password');
          }

          if (!user.isActive) {
            throw new Error('Account is inactive. Please contact administrator.');
          }

          if (!user.password) {
            throw new Error('This account uses social login. Please sign in with Google.');
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            throw new Error('Invalid email or password');
          }

          // Update last login timestamp
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            slug: user.creatorProfile?.slug ?? null,
          };
        } catch (error) {
          console.error('[Auth] Credentials login error:', error);
          throw error;
        }
      },
    }),

    /**
     * Phone OTP Provider — Creator Mobile Login
     *
     * Mock OTP verification for creator authentication.
     * Accepts a phone number and a 6-digit OTP code.
     * In development/staging the valid OTP is '123456'.
     * Finds or creates the user by phone number.
     */
    CredentialsProvider({
      id: 'phone-otp',
      name: 'Phone OTP',
      credentials: {
        phone: {
          label: 'Phone Number',
          type: 'tel',
          placeholder: '+91 9876543210',
        },
        otp: {
          label: 'OTP',
          type: 'text',
          placeholder: '123456',
        },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) {
          throw new Error('Phone number and OTP are required');
        }

        const phone = (credentials.phone as string).trim();
        const otp = credentials.otp as string;

        // Mock OTP verification — replace with real SMS provider in production
        if (otp !== '123456') {
          throw new Error('Invalid OTP. Please try again.');
        }

        try {
          // Find existing user by phone or create a new one
          let user = await prisma.user.findUnique({
            where: { phone },
            include: {
              creatorProfile: { select: { slug: true } },
            },
          });

          if (user && !user.isActive) {
            throw new Error('Account is inactive. Please contact administrator.');
          }

          if (!user) {
            // Auto-create creator account from phone number
            const name = `Creator ${phone.slice(-4)}`;
            const slug = generateSlug(name);

            user = await prisma.user.create({
              data: {
                phone,
                email: `${phone.replace(/[^0-9]/g, '')}@phone.sitrus.in`,
                name,
                role: UserRole.CREATOR,
                isActive: true,
                creatorProfile: {
                  create: {
                    slug,
                    displayName: name,
                  },
                },
              },
              include: {
                creatorProfile: { select: { slug: true } },
              },
            });
          } else if (!user.creatorProfile) {
            // Ensure creator profile exists for existing users
            const slug = await ensureCreatorProfile(user.id, user.name);
            user = {
              ...user,
              creatorProfile: { slug },
            };
          }

          // Update last login timestamp
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            slug: user.creatorProfile?.slug ?? null,
          };
        } catch (error) {
          console.error('[Auth] Phone OTP login error:', error);
          throw error;
        }
      },
    }),
  ],

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  callbacks: {
    /**
     * JWT callback — called when a token is created or updated.
     *
     * On initial sign-in, maps user fields to the token.
     * For Google sign-in, finds or creates the user in the database
     * and auto-provisions a CreatorProfile.
     */
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign-in from credentials or phone-otp providers
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.name = user.name!;
        token.role = user.role;
        token.image = user.image;
        token.slug = user.slug;
      }

      // Google OAuth sign-in — find or create user in DB
      if (account?.provider === 'google' && user) {
        try {
          let dbUser = await prisma.user.findUnique({
            where: { googleId: account.providerAccountId },
            include: {
              creatorProfile: { select: { slug: true } },
            },
          });

          if (!dbUser) {
            // Check if a user with this email already exists
            dbUser = await prisma.user.findUnique({
              where: { email: user.email!.toLowerCase() },
              include: {
                creatorProfile: { select: { slug: true } },
              },
            });

            if (dbUser) {
              // Link Google account to existing user
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                  googleId: account.providerAccountId,
                  image: user.image ?? dbUser.image,
                  emailVerified: true,
                  lastLogin: new Date(),
                },
                include: {
                  creatorProfile: { select: { slug: true } },
                },
              });
            } else {
              // Create new creator user
              const slug = generateSlug(user.name ?? 'creator');

              dbUser = await prisma.user.create({
                data: {
                  email: user.email!.toLowerCase(),
                  name: user.name ?? 'Creator',
                  googleId: account.providerAccountId,
                  image: user.image,
                  role: UserRole.CREATOR,
                  isActive: true,
                  emailVerified: true,
                  lastLogin: new Date(),
                  creatorProfile: {
                    create: {
                      slug,
                      displayName: user.name ?? 'Creator',
                      avatarUrl: user.image,
                    },
                  },
                },
                include: {
                  creatorProfile: { select: { slug: true } },
                },
              });
            }
          } else {
            // Update last login for returning Google users
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                image: user.image ?? dbUser.image,
                lastLogin: new Date(),
              },
            });
          }

          // Ensure creator profile exists
          if (!dbUser.creatorProfile && dbUser.role === UserRole.CREATOR) {
            const slug = await ensureCreatorProfile(dbUser.id, dbUser.name);
            dbUser = {
              ...dbUser,
              creatorProfile: { slug },
            };
          }

          // Map DB user to token
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.image = dbUser.image;
          token.slug = dbUser.creatorProfile?.slug ?? null;
        } catch (error) {
          console.error('[Auth] Google JWT callback error:', error);
        }
      }

      // Handle session update trigger
      if (trigger === 'update' && session) {
        token = { ...token, ...session.user };
      }

      return token;
    },

    /**
     * Session callback — maps token fields to the client-visible session.
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.image = token.image;
        session.user.slug = token.slug;
      }

      return session;
    },

    /**
     * Redirect callback — ensures redirects stay within the application.
     */
    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;

      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;

      return baseUrl;
    },
  },

  // ---------------------------------------------------------------------------
  // Pages
  // ---------------------------------------------------------------------------
  pages: {
    signIn: '/login',
    error: '/login',
  },

  // ---------------------------------------------------------------------------
  // Additional options
  // ---------------------------------------------------------------------------
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',

  // ---------------------------------------------------------------------------
  // Events — Audit logging
  // ---------------------------------------------------------------------------
  events: {
    /**
     * Log successful sign-in events to the audit trail.
     */
    async signIn({ user }) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            entityType: 'User',
            entityId: user.id!,
            ipAddress: null,
            userAgent: null,
          },
        });
      } catch (error) {
        console.error('[Auth] Failed to log sign-in event:', error);
      }
    },

    /**
     * Log sign-out events to the audit trail.
     */
    async signOut({ token }) {
      try {
        if (token?.id) {
          await prisma.auditLog.create({
            data: {
              userId: token.id as string,
              action: 'LOGOUT',
              entityType: 'User',
              entityId: token.id as string,
              ipAddress: null,
              userAgent: null,
            },
          });
        }
      } catch (error) {
        console.error('[Auth] Failed to log sign-out event:', error);
      }
    },
  },
});
