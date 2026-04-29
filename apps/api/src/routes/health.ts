import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { redis }  from "../lib/redis";

const START_TIME = Date.now();

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async (_req, reply) => {
    const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

    // Database check
    let dbStatus = "ok";
    try { await prisma.$queryRaw`SELECT 1`; }
    catch { dbStatus = "error"; }

    // Redis check
    let redisStatus = "ok";
    try { await redis.ping(); }
    catch { redisStatus = "error"; }

    const healthy = dbStatus === "ok" && redisStatus === "ok";
    const version = process.env["npm_package_version"] ?? "1.0.0";

    return reply.status(healthy ? 200 : 503).send({
      success: healthy,
      data: {
        status:   healthy ? "ok" : "degraded",
        version,
        uptime:   uptimeSeconds,
        database: dbStatus,
        redis:    redisStatus,
        env:      process.env["NODE_ENV"] ?? "development",
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Liveness probe (Kubernetes / Railway — no DB check, just process alive)
  fastify.get("/ping", async (_req, reply) => reply.send({ ok: true }));
}
