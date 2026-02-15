/**
 * Public Creator Storefront Page
 *
 * Displays a creator's public profile, collections, and product
 * recommendations. This is the main public-facing page for each
 * creator on the platform, accessible at /{slug}.
 *
 * This is a server component that fetches data directly from the
 * database via Prisma. No authentication is required.
 *
 * @module app/[slug]/page
 */

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Instagram, Youtube, Twitter, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';

// =============================================================================
// TYPES
// =============================================================================

/** Route params shape for the dynamic [slug] segment. */
interface PageProps {
  params: Promise<{ slug: string }>;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Fetches a creator's full storefront data by slug.
 *
 * Returns null if the creator does not exist, is not approved,
 * is not public, or the associated user account is inactive.
 */
async function getCreatorBySlug(slug: string) {
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          isActive: true,
        },
      },
    },
  });

  if (!creatorProfile) return null;
  if (!creatorProfile.isApproved) return null;
  if (!creatorProfile.isPublic) return null;
  if (!creatorProfile.user.isActive) return null;

  return creatorProfile;
}

/**
 * Fetches all public collections for a creator, including their products.
 * Collections and products are ordered by their respective `order` fields.
 * Only active products are included.
 */
async function getCreatorCollections(creatorUserId: string) {
  const collections = await prisma.collection.findMany({
    where: {
      creatorId: creatorUserId,
      isPublic: true,
    },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              price: true,
              originalPrice: true,
              currency: true,
              marketplace: true,
              brand: true,
              rating: true,
              isActive: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  // Filter out inactive products
  return collections.map((collection) => ({
    ...collection,
    products: collection.products.filter((cp) => cp.product.isActive),
  }));
}

/**
 * Fetches the creator's SitLinks that are not part of any collection.
 * These are displayed in the "All Products" fallback section.
 */
async function getCreatorUncollectedLinks(creatorUserId: string) {
  // Get all product IDs that are in collections
  const collectionProductIds = await prisma.collectionProduct.findMany({
    where: {
      collection: {
        creatorId: creatorUserId,
        isPublic: true,
      },
    },
    select: { productId: true },
  });

  const collectedProductIds = new Set(collectionProductIds.map((cp) => cp.productId));

  // Fetch all active links for the creator
  const links = await prisma.link.findMany({
    where: {
      creatorId: creatorUserId,
      isActive: true,
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          price: true,
          originalPrice: true,
          currency: true,
          marketplace: true,
          brand: true,
          rating: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Only include links whose product is active and not already in a collection
  return links.filter(
    (link) => link.product.isActive && !collectedProductIds.has(link.productId)
  );
}

/**
 * Returns the marketplace display color for badge styling.
 */
function getMarketplaceBadgeClass(marketplace: string): string {
  const classes: Record<string, string> = {
    MYNTRA: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    FLIPKART: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    AJIO: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    AMAZON: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };
  return classes[marketplace] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
}

/**
 * Generates initials from a name string for avatar fallback.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Formats a price in INR with the rupee symbol.
 */
function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// =============================================================================
// SEO METADATA
// =============================================================================

/**
 * Generates dynamic metadata for the creator storefront page.
 * Used by Next.js for SEO (title, description, OpenGraph).
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);

  if (!creator) {
    return {
      title: 'Creator Not Found | Sitrus',
      description: 'This creator page is not available.',
    };
  }

  const displayName = creator.displayName || creator.user.name;
  const description =
    creator.tagline ||
    creator.bio ||
    `Check out ${displayName}'s curated product recommendations on Sitrus.`;

  return {
    title: `${displayName} | Sitrus`,
    description,
    openGraph: {
      title: `${displayName} | Sitrus`,
      description,
      type: 'profile',
      ...(creator.avatarUrl && { images: [{ url: creator.avatarUrl }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | Sitrus`,
      description,
    },
  };
}

// =============================================================================
// PRODUCT CARD COMPONENT
// =============================================================================

/**
 * A single product card displayed in the storefront grid.
 *
 * @param product  - The product data to display
 * @param linkHref - The redirect URL (via /r/{shortCode} or direct)
 */
function ProductCard({
  product,
  linkHref,
}: {
  product: {
    id: string;
    title: string;
    imageUrl: string;
    price: number;
    originalPrice: number | null;
    currency: string;
    marketplace: string;
    brand: string | null;
  };
  linkHref: string;
}) {
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <Link href={linkHref} target="_blank" rel="noopener noreferrer">
      <Card className="group overflow-hidden transition-all hover:shadow-md">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Marketplace Badge */}
          <div className="absolute left-2 top-2">
            <Badge className={`text-[10px] ${getMarketplaceBadgeClass(product.marketplace)}`}>
              {product.marketplace}
            </Badge>
          </div>

          {/* Discount Badge */}
          {discount && (
            <div className="absolute right-2 top-2">
              <Badge className="bg-green-600 text-white text-[10px]">
                {discount}% OFF
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-3">
          {/* Brand */}
          {product.brand && (
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product.brand}
            </p>
          )}

          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">
            {product.title}
          </h3>

          {/* Price */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-bold">{formatPrice(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

/**
 * Public Creator Storefront Page
 *
 * Server component that renders the creator's public-facing storefront.
 * Fetches all data directly via Prisma and displays the hero section,
 * product collections, and uncollected product links.
 */
export default async function CreatorStorefrontPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch creator profile
  const creator = await getCreatorBySlug(slug);

  if (!creator) {
    notFound();
  }

  const displayName = creator.displayName || creator.user.name;

  // Fetch collections and uncollected links in parallel
  const [collections, uncollectedLinks] = await Promise.all([
    getCreatorCollections(creator.user.id),
    getCreatorUncollectedLinks(creator.user.id),
  ]);

  // Build a map of product ID -> shortCode for link generation
  const linkMap = new Map<string, string>();
  const allLinks = await prisma.link.findMany({
    where: {
      creatorId: creator.user.id,
      isActive: true,
    },
    select: {
      productId: true,
      shortCode: true,
      customAlias: true,
    },
  });

  for (const link of allLinks) {
    linkMap.set(link.productId, link.customAlias || link.shortCode);
  }

  const hasCollections = collections.some((c) => c.products.length > 0);
  const hasUncollectedLinks = uncollectedLinks.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ================================================================== */}
      {/* HERO / BANNER SECTION                                              */}
      {/* ================================================================== */}
      <section className="relative">
        {/* Banner */}
        <div className="h-48 w-full sm:h-56 md:h-64 lg:h-72">
          {creator.bannerUrl ? (
            <Image
              src={creator.bannerUrl}
              alt={`${displayName}'s banner`}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5" />
          )}
        </div>

        {/* Profile Info Overlay */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-20">
            <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
              {/* Avatar */}
              <div className="relative size-28 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-lg sm:size-36">
                {creator.avatarUrl ? (
                  <Image
                    src={creator.avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="144px"
                    priority
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-3xl font-bold text-muted-foreground sm:text-4xl">
                    {getInitials(displayName)}
                  </div>
                )}
              </div>

              {/* Name & Tagline */}
              <div className="mt-4 text-center sm:mb-2 sm:mt-0 sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {displayName}
                </h1>
                {creator.tagline && (
                  <p className="mt-1 text-base text-muted-foreground">
                    {creator.tagline}
                  </p>
                )}
              </div>
            </div>

            {/* Bio & Social Links */}
            <div className="mt-4 text-center sm:text-left">
              {creator.bio && (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {creator.bio}
                </p>
              )}

              {/* Social Links */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                {creator.instagramHandle && (
                  <a
                    href={`https://instagram.com/${creator.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Instagram className="size-4" />
                    @{creator.instagramHandle}
                  </a>
                )}
                {creator.youtubeUrl && (
                  <a
                    href={creator.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Youtube className="size-4" />
                    YouTube
                  </a>
                )}
                {creator.twitterUrl && (
                  <a
                    href={creator.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Twitter className="size-4" />
                    Twitter
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator className="mx-auto mt-8 max-w-4xl" />

      {/* ================================================================== */}
      {/* COLLECTIONS SECTION                                                */}
      {/* ================================================================== */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {!hasCollections && !hasUncollectedLinks ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4">
              <ExternalLink className="size-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              This creator hasn&apos;t added any collections yet
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Check back later for curated product recommendations from {displayName}.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Render each collection */}
            {collections.map((collection) => {
              if (collection.products.length === 0) return null;

              return (
                <div key={collection.id}>
                  {/* Collection Heading */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      {collection.name}
                    </h2>
                    {collection.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {collection.description}
                      </p>
                    )}
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {collection.products.map((cp) => {
                      const shortCode = linkMap.get(cp.product.id);
                      const href = shortCode
                        ? `/api/r/${shortCode}`
                        : '#';

                      return (
                        <ProductCard
                          key={cp.id}
                          product={cp.product}
                          linkHref={href}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ============================================================ */}
            {/* ALL PRODUCTS SECTION (uncollected links)                      */}
            {/* ============================================================ */}
            {hasUncollectedLinks && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    All Products
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    More product recommendations from {displayName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {uncollectedLinks.map((link) => {
                    const shortCode = link.customAlias || link.shortCode;

                    return (
                      <ProductCard
                        key={link.id}
                        product={link.product}
                        linkHref={`/api/r/${shortCode}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <Link href="/" className="font-medium text-foreground hover:underline">
              Sitrus
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
