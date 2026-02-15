/**
 * Sitrus Database Seed Script
 *
 * Seeds the database with sample data for development and testing:
 * - 1 Admin user
 * - 5 Creator users with profiles
 * - 50+ Products across marketplaces
 * - 20 Links distributed across creators
 * - 200+ Clicks over last 30 days
 * - 30 Earnings with varied statuses
 * - 5 Payouts with varied statuses
 * - 15 Collections (3 per creator)
 *
 * @module prisma/seed
 */

import { PrismaClient, Marketplace, EarningStatus, PayoutStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// =============================================================================
// Helpers
// =============================================================================

/** Generate a random integer between min and max (inclusive). */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random item from an array. */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a random date within the last N days. */
function randomDate(daysAgo: number): Date {
  const now = Date.now();
  const past = now - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

// =============================================================================
// Seed Data
// =============================================================================

const ADMIN_DATA = {
  email: 'admin@sitrus.club',
  password: 'Admin123!',
  name: 'Sitrus Admin',
};

const CREATORS_DATA = [
  {
    name: 'Priya Sharma',
    email: 'priya@example.com',
    slug: 'priya-sharma',
    displayName: 'Priya Styles',
    bio: 'Fashion & beauty creator sharing my favorite finds from top Indian brands.',
    instagramHandle: 'priya.styles',
    tagline: 'Your style, simplified.',
  },
  {
    name: 'Rahul Verma',
    email: 'rahul@example.com',
    slug: 'rahul-verma',
    displayName: 'TechWithRahul',
    bio: 'Tech reviewer and gadget enthusiast. Honest reviews, best deals.',
    instagramHandle: 'techwithrahul',
    tagline: 'Tech that matters.',
  },
  {
    name: 'Ananya Patel',
    email: 'ananya@example.com',
    slug: 'ananya-patel',
    displayName: 'Home by Ananya',
    bio: 'Home decor enthusiast transforming spaces with affordable finds.',
    instagramHandle: 'home.by.ananya',
    tagline: 'Make your space beautiful.',
  },
  {
    name: 'Vikram Singh',
    email: 'vikram@example.com',
    slug: 'vikram-singh',
    displayName: 'FitVikram',
    bio: 'Fitness coach sharing the best gear and supplements for your journey.',
    instagramHandle: 'fitvikram',
    tagline: 'Strength starts here.',
  },
  {
    name: 'Meera Reddy',
    email: 'meera@example.com',
    slug: 'meera-reddy',
    displayName: 'BeautyByMeera',
    bio: 'Skincare and beauty tips with product recommendations you can trust.',
    instagramHandle: 'beauty.by.meera',
    tagline: 'Glow from within.',
  },
];

const PRODUCTS_DATA = [
  // Fashion — Myntra
  { title: 'Roadster Men Slim Fit T-Shirt', price: 599, originalPrice: 999, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'Roadster', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Roadster+Tee', commissionRate: 8 },
  { title: 'Mast & Harbour Women Sneakers', price: 1499, originalPrice: 2499, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'Mast & Harbour', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Sneakers', commissionRate: 10 },
  { title: 'HRX Active Joggers', price: 899, originalPrice: 1599, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'HRX', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=HRX+Joggers', commissionRate: 9 },
  { title: 'Libas Women Kurta Set', price: 1299, originalPrice: 2199, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'Libas', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Libas+Kurta', commissionRate: 12 },
  { title: 'Allen Solly Formal Shirt', price: 1799, originalPrice: 2999, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'Allen Solly', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Allen+Solly', commissionRate: 7 },
  { title: 'ONLY Women Crop Top', price: 699, originalPrice: 1199, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'ONLY', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=ONLY+Crop+Top', commissionRate: 11 },
  { title: 'Puma Unisex Running Shoes', price: 3499, originalPrice: 5999, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'Puma', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Puma+Shoes', commissionRate: 6 },
  { title: 'W Women Palazzo Pants', price: 999, originalPrice: 1799, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'W', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=W+Palazzo', commissionRate: 10 },

  // Beauty — Myntra & Ajio
  { title: 'Maybelline Fit Me Foundation', price: 499, originalPrice: 599, marketplace: 'MYNTRA' as const, category: 'BEAUTY', brand: 'Maybelline', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Maybelline', commissionRate: 15 },
  { title: 'The Body Shop Tea Tree Face Wash', price: 895, originalPrice: 895, marketplace: 'MYNTRA' as const, category: 'BEAUTY', brand: 'The Body Shop', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Body+Shop', commissionRate: 12 },
  { title: 'Lakme Absolute Lipstick', price: 750, originalPrice: 950, marketplace: 'AJIO' as const, category: 'BEAUTY', brand: 'Lakme', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Lakme', commissionRate: 14 },
  { title: 'Cetaphil Gentle Cleanser', price: 649, originalPrice: 799, marketplace: 'AJIO' as const, category: 'BEAUTY', brand: 'Cetaphil', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Cetaphil', commissionRate: 10 },
  { title: 'Forest Essentials Night Cream', price: 2150, originalPrice: 2150, marketplace: 'MYNTRA' as const, category: 'BEAUTY', brand: 'Forest Essentials', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Forest+Essentials', commissionRate: 8 },
  { title: 'MAC Matte Lipstick Ruby Woo', price: 1750, originalPrice: 1950, marketplace: 'MYNTRA' as const, category: 'BEAUTY', brand: 'MAC', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=MAC+Lipstick', commissionRate: 7 },

  // Electronics — Flipkart & Amazon
  { title: 'boAt Airdopes 141 TWS Earbuds', price: 1299, originalPrice: 4490, marketplace: 'FLIPKART' as const, category: 'ELECTRONICS', brand: 'boAt', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=boAt+Airdopes', commissionRate: 5 },
  { title: 'Noise ColorFit Pro 5 Smartwatch', price: 3999, originalPrice: 6999, marketplace: 'FLIPKART' as const, category: 'ELECTRONICS', brand: 'Noise', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Noise+Watch', commissionRate: 6 },
  { title: 'JBL Flip 6 Bluetooth Speaker', price: 9999, originalPrice: 14999, marketplace: 'AMAZON' as const, category: 'ELECTRONICS', brand: 'JBL', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=JBL+Flip+6', commissionRate: 4 },
  { title: 'OnePlus Nord Buds 2', price: 2999, originalPrice: 3499, marketplace: 'AMAZON' as const, category: 'ELECTRONICS', brand: 'OnePlus', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=OnePlus+Buds', commissionRate: 5 },
  { title: 'Redmi Smart Band Pro', price: 2999, originalPrice: 3999, marketplace: 'FLIPKART' as const, category: 'ELECTRONICS', brand: 'Redmi', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Redmi+Band', commissionRate: 5 },
  { title: 'Samsung Galaxy Buds FE', price: 6999, originalPrice: 9999, marketplace: 'AMAZON' as const, category: 'ELECTRONICS', brand: 'Samsung', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Samsung+Buds', commissionRate: 4 },
  { title: 'Fire-Boltt Phoenix Ultra Smartwatch', price: 1799, originalPrice: 8999, marketplace: 'FLIPKART' as const, category: 'ELECTRONICS', brand: 'Fire-Boltt', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=FireBoltt', commissionRate: 7 },

  // Home & Living — Flipkart & Amazon
  { title: 'Solimo Cotton Bedsheet King Size', price: 699, originalPrice: 1299, marketplace: 'AMAZON' as const, category: 'HOME_LIVING', brand: 'Solimo', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Solimo+Bedsheet', commissionRate: 8 },
  { title: 'Milton Thermosteel Flask 1L', price: 799, originalPrice: 1299, marketplace: 'FLIPKART' as const, category: 'HOME_LIVING', brand: 'Milton', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Milton+Flask', commissionRate: 9 },
  { title: 'Prestige Omega Deluxe Induction Tawa', price: 999, originalPrice: 1595, marketplace: 'AMAZON' as const, category: 'HOME_LIVING', brand: 'Prestige', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Prestige+Tawa', commissionRate: 7 },
  { title: 'Urban Ladder Coffee Table', price: 8999, originalPrice: 12999, marketplace: 'FLIPKART' as const, category: 'HOME_LIVING', brand: 'Urban Ladder', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Coffee+Table', commissionRate: 6 },
  { title: 'Fabindia Cotton Cushion Covers (Set of 5)', price: 1299, originalPrice: 1999, marketplace: 'AMAZON' as const, category: 'HOME_LIVING', brand: 'Fabindia', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Fabindia+Cushions', commissionRate: 10 },
  { title: 'Ikea KALLAX Shelf Unit', price: 4990, originalPrice: 4990, marketplace: 'AMAZON' as const, category: 'HOME_LIVING', brand: 'IKEA', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=IKEA+KALLAX', commissionRate: 5 },
  { title: 'Bombay Dyeing Towel Set', price: 899, originalPrice: 1499, marketplace: 'FLIPKART' as const, category: 'HOME_LIVING', brand: 'Bombay Dyeing', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Bombay+Dyeing', commissionRate: 9 },

  // Health & Fitness
  { title: 'MuscleBlaze Whey Protein 1kg', price: 1899, originalPrice: 2999, marketplace: 'AMAZON' as const, category: 'HEALTH_FITNESS', brand: 'MuscleBlaze', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=MuscleBlaze', commissionRate: 10 },
  { title: 'Boldfit Yoga Mat 6mm', price: 499, originalPrice: 999, marketplace: 'AMAZON' as const, category: 'HEALTH_FITNESS', brand: 'Boldfit', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Yoga+Mat', commissionRate: 12 },
  { title: 'Fitbit Inspire 3 Fitness Tracker', price: 7999, originalPrice: 9999, marketplace: 'FLIPKART' as const, category: 'HEALTH_FITNESS', brand: 'Fitbit', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Fitbit', commissionRate: 5 },
  { title: 'Decathlon Resistance Bands Set', price: 599, originalPrice: 799, marketplace: 'FLIPKART' as const, category: 'HEALTH_FITNESS', brand: 'Decathlon', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Resistance+Bands', commissionRate: 8 },
  { title: 'Nike Dri-FIT Training Shorts', price: 1495, originalPrice: 1995, marketplace: 'MYNTRA' as const, category: 'HEALTH_FITNESS', brand: 'Nike', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Nike+Shorts', commissionRate: 7 },

  // Accessories
  { title: 'Fossil Men Analog Watch', price: 6995, originalPrice: 9995, marketplace: 'MYNTRA' as const, category: 'ACCESSORIES', brand: 'Fossil', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Fossil+Watch', commissionRate: 8 },
  { title: 'Lavie Women Handbag', price: 1799, originalPrice: 3599, marketplace: 'AJIO' as const, category: 'ACCESSORIES', brand: 'Lavie', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Lavie+Bag', commissionRate: 12 },
  { title: 'Ray-Ban Aviator Sunglasses', price: 5990, originalPrice: 7990, marketplace: 'MYNTRA' as const, category: 'ACCESSORIES', brand: 'Ray-Ban', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=RayBan', commissionRate: 6 },
  { title: 'Skybags Backpack 30L', price: 1299, originalPrice: 2999, marketplace: 'FLIPKART' as const, category: 'ACCESSORIES', brand: 'Skybags', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Skybags', commissionRate: 10 },
  { title: 'Titan Women Raga Watch', price: 4995, originalPrice: 6495, marketplace: 'AMAZON' as const, category: 'ACCESSORIES', brand: 'Titan', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Titan+Raga', commissionRate: 7 },

  // Food & Beverages
  { title: 'Sleepy Owl Cold Brew Coffee Pack', price: 599, originalPrice: 799, marketplace: 'AMAZON' as const, category: 'FOOD_BEVERAGES', brand: 'Sleepy Owl', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Sleepy+Owl', commissionRate: 15 },
  { title: 'Yoga Bar Muesli 700g', price: 399, originalPrice: 499, marketplace: 'AMAZON' as const, category: 'FOOD_BEVERAGES', brand: 'Yoga Bar', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Yoga+Bar', commissionRate: 12 },
  { title: 'True Elements Granola 900g', price: 549, originalPrice: 699, marketplace: 'FLIPKART' as const, category: 'FOOD_BEVERAGES', brand: 'True Elements', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=True+Elements', commissionRate: 14 },

  // Extra products for variety
  { title: 'Chumbak Quirky Phone Case', price: 599, originalPrice: 799, marketplace: 'FLIPKART' as const, category: 'ACCESSORIES', brand: 'Chumbak', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Chumbak+Case', commissionRate: 15 },
  { title: 'Ajio Own Label Denim Jacket', price: 1999, originalPrice: 3499, marketplace: 'AJIO' as const, category: 'FASHION', brand: 'AJIO Own', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=AJIO+Denim', commissionRate: 13 },
  { title: 'Nykaa Naturals Face Serum', price: 449, originalPrice: 599, marketplace: 'MYNTRA' as const, category: 'BEAUTY', brand: 'Nykaa', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Nykaa+Serum', commissionRate: 16 },
  { title: 'Wrogn Slim Fit Chinos', price: 1199, originalPrice: 1999, marketplace: 'MYNTRA' as const, category: 'FASHION', brand: 'Wrogn', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Wrogn+Chinos', commissionRate: 9 },
  { title: 'Wildcraft Hiking Boots', price: 2999, originalPrice: 4999, marketplace: 'FLIPKART' as const, category: 'FASHION', brand: 'Wildcraft', imageUrl: 'https://placehold.co/300x400/FF6B35/white?text=Wildcraft+Boots', commissionRate: 8 },
];

const COLLECTIONS_TEMPLATES = [
  ['My Top Picks', 'Best Deals Today', 'Seasonal Favorites'],
  ['Tech Essentials', 'Budget Finds', 'Premium Picks'],
  ['Home Must-Haves', 'Kitchen Favorites', 'Decor Ideas'],
  ['Workout Gear', 'Recovery Essentials', 'Fitness Tech'],
  ['Skincare Routine', 'Makeup Picks', 'Self-Care Kit'],
];

const DEVICES = ['mobile', 'desktop', 'tablet'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Instagram', 'Edge'];
const OPERATING_SYSTEMS = ['Android', 'iOS', 'Windows', 'macOS'];
const COUNTRIES = ['IN', 'US', 'UK', 'AE', 'SG', 'CA', 'AU'];
const REFERRERS = [
  'https://www.instagram.com/',
  'https://www.youtube.com/',
  'https://twitter.com/',
  'https://t.me/',
  'direct',
  null,
];

// =============================================================================
// Main Seed Function
// =============================================================================

async function main() {
  console.log('🌱 Starting Sitrus database seed...\n');

  // -------------------------------------------------------------------------
  // 1. Admin User
  // -------------------------------------------------------------------------
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash(ADMIN_DATA.password, 12);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_DATA.email },
    update: {},
    create: {
      email: ADMIN_DATA.email,
      password: adminPassword,
      name: ADMIN_DATA.name,
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Admin: ${admin.email} (password: ${ADMIN_DATA.password})`);

  // -------------------------------------------------------------------------
  // 2. Creator Users with Profiles
  // -------------------------------------------------------------------------
  console.log('\n👥 Creating creator accounts...');
  const creators: Array<{ userId: string; name: string; index: number }> = [];

  for (let i = 0; i < CREATORS_DATA.length; i++) {
    const c = CREATORS_DATA[i];
    const creatorPassword = await bcrypt.hash('Creator123!', 12);

    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        password: creatorPassword,
        name: c.name,
        role: 'CREATOR',
        isActive: true,
        emailVerified: true,
        creatorProfile: {
          create: {
            slug: c.slug,
            displayName: c.displayName,
            bio: c.bio,
            instagramHandle: c.instagramHandle,
            tagline: c.tagline,
            isApproved: i < 4, // First 4 approved, last one pending
            isPublic: true,
          },
        },
      },
    });
    creators.push({ userId: user.id, name: user.name, index: i });
    console.log(`  ✓ Creator: ${user.name} (@${c.instagramHandle}) — ${i < 4 ? 'Approved' : 'Pending'}`);
  }

  // -------------------------------------------------------------------------
  // 3. Products
  // -------------------------------------------------------------------------
  console.log('\n📦 Creating products...');
  const products = [];

  for (const p of PRODUCTS_DATA) {
    const product = await prisma.product.create({
      data: {
        title: p.title,
        imageUrl: p.imageUrl,
        price: p.price,
        originalPrice: p.originalPrice,
        sourceUrl: `https://www.${p.marketplace.toLowerCase()}.com/product/${nanoid(10)}`,
        marketplace: p.marketplace as Marketplace,
        category: p.category,
        brand: p.brand,
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        commissionRate: p.commissionRate,
        isActive: true,
      },
    });
    products.push(product);
  }
  console.log(`  ✓ Created ${products.length} products`);

  // -------------------------------------------------------------------------
  // 4. Links (SitLinks) — 20 links distributed across creators
  // -------------------------------------------------------------------------
  console.log('\n🔗 Creating SitLinks...');
  const links = [];
  const linksPerCreator = [5, 4, 4, 4, 3]; // 20 total

  let productIndex = 0;
  for (let ci = 0; ci < creators.length; ci++) {
    const creator = creators[ci];
    for (let li = 0; li < linksPerCreator[ci]; li++) {
      const product = products[productIndex % products.length];
      const shortCode = nanoid(8);
      const link = await prisma.link.create({
        data: {
          creatorId: creator.userId,
          productId: product.id,
          shortCode,
          affiliateUrl: `${product.sourceUrl}?aff=sitrus&creator=${creator.userId}`,
          isActive: true,
          totalClicks: 0,
        },
      });
      links.push({ ...link, creatorIndex: ci });
      productIndex++;
    }
  }
  console.log(`  ✓ Created ${links.length} SitLinks`);

  // -------------------------------------------------------------------------
  // 5. Clicks — 200+ over last 30 days
  // -------------------------------------------------------------------------
  console.log('\n🖱️  Creating click data...');
  let totalClicks = 0;
  const clickCounts: Record<string, number> = {};

  for (const link of links) {
    const numClicks = randomInt(5, 25);
    clickCounts[link.id] = numClicks;
    totalClicks += numClicks;

    const clickData = [];
    for (let i = 0; i < numClicks; i++) {
      clickData.push({
        linkId: link.id,
        ipHash: `hash_${nanoid(16)}`,
        userAgent: `Mozilla/5.0 (${randomPick(OPERATING_SYSTEMS)})`,
        referrer: randomPick(REFERRERS),
        country: randomPick(COUNTRIES),
        device: randomPick(DEVICES),
        browser: randomPick(BROWSERS),
        os: randomPick(OPERATING_SYSTEMS),
        createdAt: randomDate(30),
      });
    }

    await prisma.click.createMany({ data: clickData });

    // Update denormalized totalClicks
    await prisma.link.update({
      where: { id: link.id },
      data: { totalClicks: numClicks },
    });
  }
  console.log(`  ✓ Created ${totalClicks} clicks across ${links.length} links`);

  // -------------------------------------------------------------------------
  // 6. Earnings — 30 entries with varied statuses
  // -------------------------------------------------------------------------
  console.log('\n💰 Creating earnings...');
  const earningStatuses: EarningStatus[] = ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED'];
  const periods = ['2025-12', '2026-01', '2026-02'];
  let earningCount = 0;

  for (const creator of creators) {
    const creatorLinks = links.filter((l) => l.creatorIndex === creator.index);
    for (let ei = 0; ei < 6; ei++) {
      const link = creatorLinks[ei % creatorLinks.length];
      const status = earningStatuses[ei % earningStatuses.length];
      const amount = parseFloat((randomInt(100, 800) + Math.random()).toFixed(2));

      await prisma.earning.create({
        data: {
          creatorId: creator.userId,
          linkId: link?.id || null,
          amount,
          status,
          period: randomPick(periods),
          description: `Commission earnings for ${periods[ei % periods.length]}`,
          createdAt: randomDate(60),
        },
      });
      earningCount++;
    }
  }
  console.log(`  ✓ Created ${earningCount} earnings`);

  // -------------------------------------------------------------------------
  // 7. Payouts — 5 with varied statuses
  // -------------------------------------------------------------------------
  console.log('\n💳 Creating payouts...');
  const payoutStatuses: PayoutStatus[] = [
    'PENDING',
    'APPROVED',
    'PROCESSING',
    'COMPLETED',
    'REJECTED',
  ];

  for (let pi = 0; pi < creators.length; pi++) {
    const creator = creators[pi];
    const status = payoutStatuses[pi];
    // Keep payout amounts small so creators still have available balance for demo
    const amount = parseFloat((randomInt(50, 150) + Math.random()).toFixed(2));

    await prisma.payout.create({
      data: {
        creatorId: creator.userId,
        amount,
        status,
        method: randomPick(['upi', 'bank_transfer']),
        approvedBy: status !== 'PENDING' && status !== 'REJECTED' ? admin.id : null,
        processedAt: status === 'COMPLETED' || status === 'PROCESSING' ? randomDate(7) : null,
        reference: status === 'COMPLETED' ? `TXN_${nanoid(12)}` : null,
        createdAt: randomDate(30),
      },
    });
    console.log(`  ✓ Payout for ${creator.name}: ₹${amount.toFixed(2)} [${status}]`);
  }

  // -------------------------------------------------------------------------
  // 8. Collections — 3 per creator (15 total)
  // -------------------------------------------------------------------------
  console.log('\n📂 Creating collections...');
  let collectionCount = 0;

  for (let ci = 0; ci < creators.length; ci++) {
    const creator = creators[ci];
    const templates = COLLECTIONS_TEMPLATES[ci];

    for (let ti = 0; ti < templates.length; ti++) {
      const collectionName = templates[ti];
      const collectionSlug = collectionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const collection = await prisma.collection.create({
        data: {
          creatorId: creator.userId,
          name: collectionName,
          slug: collectionSlug,
          isPublic: ti < 2, // First 2 public, third private
          order: ti,
        },
      });

      // Add 3-5 random products to each collection
      const numProducts = randomInt(3, 5);
      const shuffled = [...products].sort(() => Math.random() - 0.5);
      for (let pi = 0; pi < numProducts; pi++) {
        await prisma.collectionProduct.create({
          data: {
            collectionId: collection.id,
            productId: shuffled[pi].id,
            order: pi,
          },
        });
      }

      collectionCount++;
    }
  }
  console.log(`  ✓ Created ${collectionCount} collections with products`);

  // -------------------------------------------------------------------------
  // 9. Audit Logs
  // -------------------------------------------------------------------------
  console.log('\n📋 Creating audit logs...');
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: admin.id,
      changes: { action: 'Database seeded' },
    },
  });
  console.log('  ✓ Created seed audit log');

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Seed completed successfully!');
  console.log('='.repeat(60));
  console.log(`
  Admin:     ${ADMIN_DATA.email} / ${ADMIN_DATA.password}
  Creators:  ${creators.length} accounts (password: Creator123!)
  Products:  ${products.length}
  SitLinks:  ${links.length}
  Clicks:    ${totalClicks}
  Earnings:  ${earningCount}
  Payouts:   ${creators.length}
  Collections: ${collectionCount}
  `);
}

// =============================================================================
// Execute
// =============================================================================

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
