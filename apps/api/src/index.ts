import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import fjwt from "@fastify/jwt";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { prisma } from "./lib/prisma";
import { authRoutes } from "./routes/auth";
import { restaurantRoutes } from "./routes/restaurants";
import { bookingRoutes } from "./routes/bookings";
import { reviewRoutes } from "./routes/reviews";
import { ownerRoutes } from "./routes/owner";
import { adminRoutes } from "./routes/admin";
import { paymentRoutes } from "./routes/payments";
import { uploadRoutes } from "./routes/upload";

// ─────────────────────────────────────────────────────
// Fastify instance
// ─────────────────────────────────────────────────────
export const app = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] ?? "info",
    transport:
      process.env["NODE_ENV"] !== "production"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
        : undefined,
  },
  requestIdHeader: "x-request-id",
  trustProxy: true,
  ajv: { customOptions: { coerceTypes: "array", useDefaults: true } },
});

// ─────────────────────────────────────────────────────
// Socket.IO — real-time seat availability updates
// ─────────────────────────────────────────────────────
const httpServer = createServer(app.server);
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (process.env["CORS_ORIGINS"] ?? "http://localhost:3000").split(","),
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  app.log.info(`[socket] client connected: ${socket.id}`);

  // Client joins a restaurant room to receive seat updates
  socket.on("join:restaurant", (restaurantId: string) => {
    socket.join(`restaurant:${restaurantId}`);
    app.log.info(`[socket] ${socket.id} joined restaurant:${restaurantId}`);
  });

  socket.on("leave:restaurant", (restaurantId: string) => {
    socket.leave(`restaurant:${restaurantId}`);
  });

  socket.on("disconnect", () => {
    app.log.info(`[socket] client disconnected: ${socket.id}`);
  });
});

// Attach io to Fastify so routes can emit events
app.decorate("io", io);

// ─────────────────────────────────────────────────────
// Plugins
// ─────────────────────────────────────────────────────
async function registerPlugins() {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(cors, {
    origin: (process.env["CORS_ORIGINS"] ?? "http://localhost:3000").split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
  });

  await app.register(cookie, {
    secret: process.env["COOKIE_SECRET"] ?? "change-me-cookie-secret-32-chars",
    hook: "onRequest",
  });

  await app.register(fjwt, {
    secret: process.env["JWT_SECRET"] ?? "change-me-jwt-secret-min-32-chars!!",
    cookie: { cookieName: "refreshToken", signed: false },
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: Number(process.env["RATE_LIMIT_MAX"] ?? 100),
    timeWindow: Number(process.env["RATE_LIMIT_WINDOW_MS"] ?? 60_000),
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
      },
    }),
  });

  // Decorate authenticate helper used by protected routes
  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      return reply
        .status(401)
        .send({ success: false, error: { code: "UNAUTHORIZED", message: "Valid JWT required" } });
    }
  });
}

// ─────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────
async function registerRoutes() {
  const prefix = process.env["API_PREFIX"] ?? "/api/v1";

  // Health check (no prefix)
  app.get("/health", async () => {
    let dbStatus: "ok" | "error" = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }
    return {
      success: true,
      data: {
        status: dbStatus === "ok" ? "ok" : "degraded",
        version: process.env["APP_VERSION"] ?? "0.0.1",
        uptime: Math.round(process.uptime()),
        environment: process.env["NODE_ENV"] ?? "development",
        services: { database: dbStatus, socketio: "ok" },
      },
    };
  });

  await app.register(authRoutes,       { prefix: `${prefix}/auth` });
  await app.register(restaurantRoutes, { prefix: `${prefix}/restaurants` });
  await app.register(bookingRoutes,    { prefix: `${prefix}/bookings` });
  await app.register(reviewRoutes,     { prefix: `${prefix}/reviews` });
  await app.register(paymentRoutes,    { prefix: `${prefix}/payments` });
  await app.register(ownerRoutes,      { prefix: `${prefix}/owner` });
  await app.register(adminRoutes,      { prefix: `${prefix}/admin` });
  await app.register(uploadRoutes,     { prefix: `${prefix}/upload` });
}

// ─────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────
function registerErrorHandler() {
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    if (error.validation) {
      return reply.status(422).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.validation,
        },
      });
    }

    const status = error.statusCode ?? 500;
    return reply.status(status).send({
      success: false,
      error: {
        code: status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
        message:
          process.env["NODE_ENV"] === "production" && status >= 500
            ? "An unexpected error occurred"
            : error.message,
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });
}

// ─────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────
async function bootstrap() {
  await registerPlugins();
  registerErrorHandler();
  await registerRoutes();

  const port = Number(process.env["API_PORT"] ?? 4000);
  const host = process.env["API_HOST"] ?? "0.0.0.0";

  // Listen on the underlying httpServer (not app.listen) so Socket.IO shares the port
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(port, host, (err?: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });

  app.log.info(`🚀  DineSpot API      →  http://${host}:${port}`);
  app.log.info(`📖  Swagger docs      →  http://${host}:${port}/docs`);
  app.log.info(`🔌  Socket.IO ready   →  ws://${host}:${port}`);
  app.log.info(`💚  Health check      →  http://${host}:${port}/health`);
}

bootstrap().catch((err) => {
  console.error("❌  Failed to start server:", err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info(`${signal} received — shutting down gracefully`);
  io.close();
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
