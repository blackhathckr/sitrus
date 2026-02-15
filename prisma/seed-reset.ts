/**
 * Database Reset Script
 *
 * Wipes all data from the database, truncating all tables.
 * Use with caution - this action is irreversible!
 *
 * Usage: npx ts-node prisma/seed-reset.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Delete all data from all tables in the correct order
 * (respecting foreign key constraints)
 */
async function resetDatabase() {
  console.log('🗑️  Starting database reset...');
  console.log('⚠️  WARNING: This will delete ALL data from the database!\n');

  try {
    // Delete in order of dependencies (child tables first)

    console.log('Deleting audit logs...');
    await prisma.auditLog.deleteMany();

    console.log('Deleting notifications...');
    await prisma.notification.deleteMany();

    console.log('Deleting comments...');
    await prisma.comment.deleteMany();

    console.log('Deleting metrics...');
    await prisma.metric.deleteMany();

    console.log('Deleting fishbone items...');
    await prisma.fishboneItem.deleteMany();

    console.log('Deleting fishbone categories...');
    await prisma.fishboneCategory.deleteMany();

    console.log('Deleting fishbone diagrams...');
    await prisma.fishboneDiagram.deleteMany();

    console.log('Deleting gallery items...');
    await prisma.galleryItem.deleteMany();

    console.log('Deleting documents...');
    await prisma.document.deleteMany();

    console.log('Deleting activity dependencies...');
    await prisma.activityDependency.deleteMany();

    console.log('Deleting review features...');
    await prisma.reviewFeature.deleteMany();

    console.log('Deleting challenges...');
    await prisma.challenge.deleteMany();

    console.log('Deleting risks...');
    await prisma.risk.deleteMany();

    console.log('Deleting reviews...');
    await prisma.review.deleteMany();

    console.log('Deleting activities...');
    await prisma.activity.deleteMany();

    console.log('Deleting vision items...');
    await prisma.visionItem.deleteMany();

    console.log('Deleting milestones...');
    await prisma.milestone.deleteMany();

    console.log('Deleting team members...');
    await prisma.teamMember.deleteMany();

    console.log('Deleting teams...');
    await prisma.team.deleteMany();

    console.log('Deleting visions...');
    await prisma.vision.deleteMany();

    console.log('Deleting users...');
    await prisma.user.deleteMany();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' Database reset completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAll tables have been emptied.');
    console.log('Run "npx prisma db seed" to seed with basic users.');
    console.log('Run "npx ts-node prisma/seed-full.ts" for full data.\n');

  } catch (error) {
    console.error(' Error resetting database:', error);
    throw error;
  }
}

/**
 * Execute reset function
 */
resetDatabase()
  .catch((error) => {
    console.error(' Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
