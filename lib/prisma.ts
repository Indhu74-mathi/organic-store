import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client Singleton
 * 
 * Prevents multiple instances of PrismaClient in serverless environments.
 * In development, reuses the same instance across hot reloads.
 * In production (Vercel/serverless), creates a new instance per function invocation.
 * 
 * SECURITY: Never expose database credentials or connection strings.
 */

// Type-safe global variable for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma Client instance
 * 
 * - Development: Reuses global instance to prevent multiple connections during hot reload
 * - Production: Creates new instance per serverless function (Vercel handles connection pooling)
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

// In development, store Prisma Client in global to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Export as default for convenience
export default prisma
