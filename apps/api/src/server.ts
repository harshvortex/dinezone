import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { authRoutes } from "./routes/auth";
import { restaurantRoutes } from "./routes/restaurants";
import { bookingRoutes } from "./routes/bookings";
import { reviewRoutes } from "./routes/reviews";
import { prisma } from "./lib/prisma";

const server = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] ?? "info",
    transport:
      process.env["NODE_ENV"] !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
  requestIdHeader: "x-request-id",
  trustProxy: true,
});

// ── Decorate authenticate ─────────────────
server.decorate("authenticate", async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }
});

async function bootstrap() {
  // ── Security ─────────────────────────────
  await server.register(helmet, { contentSecurityPolicy: false });
  await server.register(cors, {
    origin: (process.env["CORS_ORIGINS"] ?? "http://localhost:3000").split(","),
    credentials: true,
  });
  await server.register(cookie, { secret: process.env["COOKIE_SECRET"] ?? "change-me-cookie" });
  await server.register(jwt, {
    secret: process.env["JWT_SECRET"] ?? "change-me-jwt-min-32-chars-long!!",
    cookie: { cookieName: "refreshToken", signed: false },
  });

  // ── Rate Limiting ─────────────────────────
  await server.register(rateLimit, {
    max: Number(process.env["RATE_LIMIT_MAX"] ?? 100),
    timeWindow: Number(process.env["RATE_LIMIT_WINDOW_MS"] ?? 60_000),
  });

  // ── Swagger / OpenAPI ─────────────────────
  await server.register(swagger, {
    openapi: {
      info: { title: "DineSpot API", description: "DineSpot REST API", version: "0.0.1" },
      servers: [{ url: process.env["API_BASE_URL"] ?? "http://localhost:4000" }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
  });
  await server.register(swaggerUi, { routePrefix: "/docs", uiConfig: { docExpansion: "tag" } });

  // ── Health ────────────────────────────────
  server.get("/health", async () => {
    let dbStatus: "ok" | "error" = "ok";
    try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = "error"; }
    return {
      success: true,
      data: {
        status: dbStatus === "ok" ? "ok" : "degraded",
        version: process.env["APP_VERSION"] ?? "0.0.1",
        uptime: process.uptime(),
        services: { database: dbStatus, redis: "ok" },
      },
    };
  });

  // ── Routes ────────────────────────────────
  const prefix = process.env["API_PREFIX"] ?? "/api/v1";
  await server.register(authRoutes,       { prefix: `${prefix}/auth` });
  await server.register(restaurantRoutes, { prefix: `${prefix}/restaurants` });
  await server.register(bookingRoutes,    { prefix: `${prefix}/bookings` });
  await server.register(reviewRoutes,     { prefix: `${prefix}/reviews` });

  // ── Global error handler ──────────────────
  server.setErrorHandler((error, _request, reply) => {
    server.log.error(error);
    if (error.name === "ZodError") {
      return reply.status(422).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.message },
      });
    }
    const status = error.statusCode ?? 500;
    return reply.status(status).send({
      success: false,
      error: { code: status === 500 ? "INTERNAL_ERROR" : "BAD_REQUEST", message: error.message },
    });
  });

  // ── Start ─────────────────────────────────
  const port = Number(process.env["API_PORT"] ?? 4000);
  const host = process.env["API_HOST"] ?? "0.0.0.0";
  await server.listen({ port, host });
  server.log.info(`🚀 DineSpot API  →  http://${host}:${port}`);
  server.log.info(`📖 Swagger docs  →  http://${host}:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
