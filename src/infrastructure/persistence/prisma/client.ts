import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createTenantExtension } from './tenant-extension';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Returns a Prisma client with tenant isolation extension applied.
 * Auto-injects companyId into all queries on tenant-scoped models.
 *
 * Usage in API routes:
 *   const tenantPrisma = getPrismaForTenant(auth.companyId);
 *   const employees = await tenantPrisma.user.findMany(); // auto-filtered by companyId
 *
 * NOTE: Existing code still uses `import { prisma }` directly.
 * Migration to getPrismaForTenant will be done incrementally.
 */
export function getPrismaForTenant(companyId: string) {
  return prisma.$extends(createTenantExtension(companyId));
}
