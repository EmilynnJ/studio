import { PrismaClient } from '@prisma/client';

declare global {
  // Ensure only a single instance of Prisma Client is used in development
  var prisma: PrismaClient | undefined;
}

// Use existing client on the global object if available, otherwise create a new one
const prisma = global.prisma ?? new PrismaClient();

// Prevent multiple instances of Prisma Client in development due to module reloads
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
