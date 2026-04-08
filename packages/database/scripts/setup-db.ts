import { PrismaClient } from '../src';

const prisma = new PrismaClient();

async function main() {
  console.log('Setting up database indexes...');

  try {
    // 1. Setup TTL Index for AuditLog (30 days)
    // expireAfterSeconds: 30 * 24 * 60 * 60 = 2592000
    // Note: In MongoDB, if the index already exists with different options, 
    // it will fail. We use runCommandRaw for direct control.
    
    // @ts-ignore - Prisma raw commands
    await prisma.$runCommandRaw({
      createIndexes: 'AuditLog',
      indexes: [
        {
          key: { createdAt: 1 },
          name: 'AuditLog_TTL_Index',
          expireAfterSeconds: 2592000, // 30 days
        },
      ],
    });

    console.log('✅ TTL Index for AuditLog created/updated.');
  } catch (error: any) {
    if (error.message?.includes('Index already exists')) {
        console.log('ℹ️ TTL Index already exists. Skipping...');
    } else {
        console.error('❌ Failed to setup indexes:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
