import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface JWTPayload {
  sub: string;      // userId
  email: string;
  role: "USER" | "RESTAURANT_OWNER" | "ADMIN";
  iat: number;
  exp: number;
}

// Augment Fastify's request to include typed user
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

// ─────────────────────────────────────────
// verifyJWT — extract + verify Bearer token
// Attaches decoded payload to request.user
// ─────────────────────────────────────────
export async function verifyJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // @fastify/jwt reads Authorization: Bearer <token> automatically
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authentication token",
      },
    });
  }
}

// ─────────────────────────────────────────
// requireRole — role-based guard (call AFTER verifyJWT)
// Usage: { onRequest: [verifyJWT, requireRole("ADMIN")] }
// ─────────────────────────────────────────
export function requireRole(
  ...roles: Array<"USER" | "RESTAURANT_OWNER" | "ADMIN">
) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = request.user as JWTPayload;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    if (!roles.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Required role: ${roles.join(" or ")}`,
        },
      });
    }
  };
}

// ─────────────────────────────────────────
// requireOwnership — verify user owns the restaurant
// Usage: pass restaurantId as a route param named :restaurantId
// ─────────────────────────────────────────
export async function requireRestaurantOwnership(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user as JWTPayload;
  const { restaurantId } = request.params as { restaurantId?: string };

  if (!restaurantId) {
    return reply.status(400).send({
      success: false,
      error: { code: "BAD_REQUEST", message: "restaurantId param required" },
    });
  }

  // ADMIN bypasses ownership check
  if (user.role === "ADMIN") return;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });

  if (!restaurant) {
    return reply.status(404).send({
      success: false,
      error: { code: "NOT_FOUND", message: "Restaurant not found" },
    });
  }

  if (restaurant.ownerId !== user.sub) {
    return reply.status(403).send({
      success: false,
      error: { code: "FORBIDDEN", message: "You do not own this restaurant" },
    });
  }
}
