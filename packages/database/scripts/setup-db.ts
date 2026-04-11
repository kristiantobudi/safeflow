import { PrismaClient } from '../src';

const prisma = new PrismaClient();

async function main() {
  console.log('Setting up database indexes...');

  try {
    console.log('PostgreSQL setup complete. TTL index logic moved to API cron jobs.');
  } catch (error: any) {
    console.error('❌ Failed to setup database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
