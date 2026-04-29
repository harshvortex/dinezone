import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT, requireRole } from "../middleware/auth";
import { getPlatformAnalytics } from "../services/analytics";

const paginationSchema = z.object({
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const bookingFilterSchema = paginationSchema.extend({
  date:         z.string().optional(),
  status:       z.string().optional(),
  restaurantId: z.string().uuid().optional(),
  bookingType:  z.enum(["TABLE","BUFFET","EVENT_HALL"]).optional(),
});

const roleSchema = z.object({
  role: z.enum(["USER","RESTAURANT_OWNER","ADMIN"]),
});

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", verifyJWT);
  fastify.addHook("onRequest", requireRole("ADMIN"));

  // ── GET /admin/dashboard ──────────────────
  fastify.get("/dashboard", async (_request, reply) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const [
      totalUsers, totalRestaurants, pendingVerifications,
      todayBookings, todayRevenue,
      bookingsByStatus, bookingsByType,
      newUsersToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count({ where: { isActive: true } }),
      prisma.restaurant.count({ where: { isVerified: false, isActive: true } }),
      prisma.booking.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.booking.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow }, paymentStatus: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { createdAt: { gte: today, lt: tomorrow } },
        _count: { id: true },
      }),
      prisma.booking.groupBy({
        by: ["bookingType"],
        where: { createdAt: { gte: today, lt: tomorrow } },
        _count: { id: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    ]);

    return reply.send({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          restaurants: totalRestaurants,
          pendingVerifications,
          todayBookings,
          todayRevenue: Number(todayRevenue._sum.totalAmount ?? 0),
          newUsersToday,
        },
        bookingsByStatus: Object.fromEntries(bookingsByStatus.map(b => [b.status, b._count.id])),
        bookingsByType:   Object.fromEntries(bookingsByType.map(b => [b.bookingType, b._count.id])),
      },
    });
  });

  // ── GET /admin/restaurants ────────────────
  fastify.get("/restaurants", async (request, reply) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const { q, isVerified, isActive } = request.query as Record<string, string>;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }];
    if (isVerified !== undefined) where.isVerified = isVerified === "true";
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [total, restaurants] = await Promise.all([
      prisma.restaurant.count({ where }),
      prisma.restaurant.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { bookings: true, reviews: true, tables: true } },
        },
      }),
    ]);

    return reply.send({
      success: true, data: restaurants,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // ── PUT /admin/restaurants/:id/verify ─────
  fastify.put("/restaurants/:id/verify", async (request, reply) => {
    const { id } = request.params as { id: string };
    const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { isVerified: true } });
    if (!restaurant) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Restaurant not found" } });
    const updated = await prisma.restaurant.update({ where: { id }, data: { isVerified: !restaurant.isVerified } });
    return reply.send({ success: true, data: updated, message: `Restaurant ${updated.isVerified ? "verified" : "unverified"}` });
  });

  // ── PUT /admin/restaurants/:id/suspend ────
  fastify.put("/restaurants/:id/suspend", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };
    const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { isActive: true } });
    if (!restaurant) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Restaurant not found" } });
    const updated = await prisma.restaurant.update({ where: { id }, data: { isActive: !restaurant.isActive } });
    return reply.send({ success: true, data: updated, message: `Restaurant ${updated.isActive ? "unsuspended" : "suspended"}` });
  });

  // ── GET /admin/users ──────────────────────
  fastify.get("/users", async (request, reply) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const { q, role } = request.query as Record<string, string>;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }];
    if (role) where.role = role;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          isActive: true, avatar: true, createdAt: true,
          _count: { select: { bookings: true, reviews: true } },
        },
      }),
    ]);

    return reply.send({
      success: true, data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // ── PUT /admin/users/:id/role ─────────────
  fastify.put("/users/:id/role", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = roleSchema.parse(request.body);
    const user = await prisma.user.update({ where: { id }, data: { role } });
    return reply.send({ success: true, data: { id: user.id, name: user.name, role: user.role }, message: `Role updated to ${role}` });
  });

  // ── GET /admin/bookings ───────────────────
  fastify.get("/bookings", async (request, reply) => {
    const q = bookingFilterSchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const where: any = {};
    if (q.date)         where.date         = new Date(q.date);
    if (q.status)       where.status       = q.status;
    if (q.restaurantId) where.restaurantId = q.restaurantId;
    if (q.bookingType)  where.bookingType  = q.bookingType;

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where, skip, take: q.limit,
        orderBy: { createdAt: "desc" },
        include: {
          user:         { select: { id: true, name: true, email: true } },
          restaurant:   { select: { id: true, name: true, city: true } },
          table:        { select: { tableNumber: true } },
          buffetSession:{ select: { name: true } },
          eventHall:    { select: { name: true } },
        },
      }),
    ]);

    return reply.send({
      success: true, data: bookings,
      meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    });
  });

  // ── GET /admin/analytics ──────────────────
  fastify.get("/analytics", async (_request, reply) => {
    const analytics = await getPlatformAnalytics();
    return reply.send({ success: true, data: analytics });
  });
}
