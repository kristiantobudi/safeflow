import { PrismaClient } from './generated/index.js';

export * from './generated/index.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  } as any);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
