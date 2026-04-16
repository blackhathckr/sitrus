/**
 * Sitrus Production Seed Script
 *
 * Seeds only the admin user — no dummy data.
 *
 * Usage: npx tsx prisma/seed-prod.ts
 *
 * @module prisma/seed-prod
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_DATA = {
  email: 'admin@sitrus.club',
  password: 'Admin123!',
  name: 'Sitrus Admin',
};

async function main() {
  console.log('Seeding production database (admin only)...\n');

  const hashedPassword = await bcrypt.hash(ADMIN_DATA.password, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_DATA.email },
    update: {},
    create: {
      email: ADMIN_DATA.email,
      password: hashedPassword,
      name: ADMIN_DATA.name,
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  console.log(`  Admin: ${admin.email} (password: ${ADMIN_DATA.password})`);
  console.log('\nProduction seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
