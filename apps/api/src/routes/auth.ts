import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createClerkClient } from "@clerk/backend";
import { prisma } from "../lib/prisma";
import { verifyJWT } from "../middleware/auth";
import type { JWTPayload } from "../middleware/auth";

// ─── Clerk client (phone OTP) ─────────────
const clerk = createClerkClient({
  secretKey: process.env["CLERK_SECRET_KEY"] ?? "",
});

// ─── Zod schemas ──────────────────────────
const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164 format e.g. +919876543210").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const phoneLoginSchema = z.object({
  clerkSessionToken: z.string().min(1, "Clerk session token required"),
  phone: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Token helpers ────────────────────────
const SALT_ROUNDS = 12;
const ACCESS_EXPIRES  = process.env["JWT_EXPIRES_IN"]         ?? "15m";
const REFRESH_EXPIRES = process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d";

function makeTokens(
  fastify: FastifyInstance,
  payload: Omit<JWTPayload, "iat" | "exp">
) {
  const accessToken = fastify.jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role },
    { expiresIn: ACCESS_EXPIRES }
  );
  const refreshToken = fastify.jwt.sign(
    { sub: payload.sub },
    { expiresIn: REFRESH_EXPIRES }
  );
  return { accessToken, refreshToken, expiresIn: 900 };
}

// ─── Plugin ───────────────────────────────
export async function authRoutes(fastify: FastifyInstance) {
  // ──────────────────────────────────────
  // POST /auth/register
  // ──────────────────────────────────────
  fastify.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: "CONFLICT", message: "An account with this email already exists" },
      });
    }

    if (body.phone) {
      const phoneExists = await prisma.user.findUnique({ where: { phone: body.phone } });
      if (phoneExists) {
        return reply.status(409).send({
          success: false,
          error: { code: "CONFLICT", message: "Phone number already in use" },
        });
      }
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        passwordHash,            // add passwordHash field to schema if not present
      } as any,
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, avatar: true, createdAt: true,
      },
    });

    const tokens = makeTokens(fastify, { sub: user.id, email: user.email, role: user.role as JWTPayload["role"] });

    return reply.status(201).send({ success: true, data: { user, tokens } });
  });

  // ──────────────────────────────────────
  // POST /auth/login
  // ──────────────────────────────────────
  fastify.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !(user as any).passwordHash) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid email or password" },
      });
    }

    if (!user.isActive) {
      return reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "Account suspended. Contact support." },
      });
    }

    const valid = await bcrypt.compare(body.password, (user as any).passwordHash as string);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid email or password" },
      });
    }

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });

    const tokens = makeTokens(fastify, { sub: user.id, email: user.email, role: user.role as JWTPayload["role"] });
    const { ...safeUser } = user as any;
    delete safeUser.passwordHash;

    return reply.send({ success: true, data: { user: safeUser, tokens } });
  });

  // ──────────────────────────────────────
  // POST /auth/login/phone  (Clerk OTP)
  // Flow: frontend uses Clerk's JS SDK to verify OTP
  //       → Clerk returns a session token
  //       → send that token here to get our own JWT
  // ──────────────────────────────────────
  fastify.post("/login/phone", async (request, reply) => {
    const body = phoneLoginSchema.parse(request.body);

    // Verify the Clerk session token
    let clerkUser: Awaited<ReturnType<typeof clerk.users.getUser>> | null = null;
    try {
      const session = await clerk.sessions.verifySession(
        body.clerkSessionToken,
        body.clerkSessionToken
      );
      clerkUser = await clerk.users.getUser(session.userId);
    } catch (err) {
      fastify.log.warn("Clerk session verification failed:", err);
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired Clerk session" },
      });
    }

    const phone = clerkUser.phoneNumbers[0]?.phoneNumber ?? body.phone;
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const name  = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "DineSpot User";

    if (!phone) {
      return reply.status(400).send({
        success: false,
        error: { code: "BAD_REQUEST", message: "Phone number not found in Clerk user" },
      });
    }

    // Upsert user — link Clerk account
    const user = await prisma.user.upsert({
      where: { phone },
      update: { updatedAt: new Date() },
      create: {
        name,
        email: email ?? `${phone.replace("+", "")}@phone.dinespot.app`,
        phone,
      } as any,
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, avatar: true, createdAt: true,
      },
    });

    if (!(user as any).isActive) {
      return reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "Account suspended" },
      });
    }

    const tokens = makeTokens(fastify, { sub: user.id, email: user.email, role: user.role as JWTPayload["role"] });
    return reply.send({ success: true, data: { user, tokens } });
  });

  // ──────────────────────────────────────
  // POST /auth/refresh
  // ──────────────────────────────────────
  fastify.post("/refresh", async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);

    let payload: { sub: string };
    try {
      payload = fastify.jwt.verify<{ sub: string }>(refreshToken);
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token" },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not found or deactivated" },
      });
    }

    const tokens = makeTokens(fastify, { sub: user.id, email: user.email, role: user.role as JWTPayload["role"] });
    return reply.send({ success: true, data: { tokens } });
  });

  // ──────────────────────────────────────
  // GET /auth/me  [protected]
  // ──────────────────────────────────────
  fastify.get("/me", { onRequest: [verifyJWT] }, async (request, reply) => {
    const { sub } = request.user as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true, name: true, email: true, phone: true,
        avatar: true, role: true, isActive: true, createdAt: true,
        _count: { select: { bookings: true, reviews: true } },
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    return reply.send({ success: true, data: user });
  });

  // ──────────────────────────────────────
  // POST /auth/logout
  // ──────────────────────────────────────
  fastify.post("/logout", { onRequest: [verifyJWT] }, async (_request, reply) => {
    // Stateless JWT — client must discard tokens
    // In production: add token to a Redis blocklist here
    reply.clearCookie("refreshToken");
    return reply.send({ success: true, data: null, message: "Logged out successfully" });
  });
}
