import { PrismaClient } from "@prisma/client";

/**
 * Single shared Prisma client instance. In dev, Next/Nest hot-reload can
 * otherwise spawn a new client (and a new connection pool) per reload —
 * stashing it on globalThis avoids exhausting the Postgres connection limit.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
