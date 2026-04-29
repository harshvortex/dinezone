import { PrismaClient } from "@prisma/client";

// Prisma singleton — prevents multiple connections in dev (Next.js HMR / tsx watch)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on("SIGTERM", async () => { await prisma.$disconnect(); });
process.on("SIGINT",  async () => { await prisma.$disconnect(); });
