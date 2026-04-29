import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT, requireRole, requireRestaurantOwnership } from "../middleware/auth";
import { getOwnerAnalytics, getPeakHoursHeatmap } from "../services/analytics";
import type { JWTPayload } from "../middleware/auth";

// ─── Schemas ──────────────────────────────
const tableCreateSchema = z.object({
  tableNumber: z.string().min(1).max(20),
  section:     z.string().max(50).optional(),
  capacity:    z.number().int().min(1).max(50),
  maxCapacity: z.number().int().min(1).max(50).optional(),
  isActive:    z.boolean().default(true),
});

const buffetCreateSchema = z.object({
  name:        z.enum(["BREAKFAST","BRUNCH","LUNCH","EVENING_SNACKS","DINNER"]),
  startTime:   z.string().regex(/^\d{2}:\d{2}$/),
  endTime:     z.string().regex(/^\d{2}:\d{2}$/),
  pricePerHead:z.number().positive(),
  childPrice:  z.number().positive().optional(),
  maxCapacity: z.number().int().min(1),
  isActive:    z.boolean().default(true),
});

const hallCreateSchema = z.object({
  name:       z.string().min(2).max(100),
  capacity:   z.number().int().min(1),
  pricePerDay:z.number().positive(),
  amenities:  z.array(z.string()).default([]),
  minBookingDays: z.number().int().min(1).default(1),
  isActive:   z.boolean().default(true),
  description:z.string().max(1000).optional(),
});

const hoursSchema = z.array(z.object({
  dayOfWeek: z.enum(["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]),
  openTime:  z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed:  z.boolean().default(false),
}));

const analyticsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]!;
  }),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split("T")[0]!),
});

// ─────────────────────────────────────────
// Owner routes plugin
// ─────────────────────────────────────────
export async function ownerRoutes(fastify: FastifyInstance) {
  // All routes require RESTAURANT_OWNER or ADMIN
  fastify.addHook("onRequest", verifyJWT);
  fastify.addHook("onRequest", requireRole("RESTAURANT_OWNER", "ADMIN"));

  // ── GET /owner/dashboard ──────────────────
  fastify.get("/dashboard", async (request, reply) => {
    const user = request.user as JWTPayload;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const in7Days  = new Date(today); in7Days.setDate(today.getDate() + 7);

    // Find restaurants owned by this user
    const owned = await prisma.restaurant.findMany({
      where: user.role === "ADMIN" ? {} : { ownerId: user.sub },
      select: { id: true, name: true },
    });
    const ownedIds = owned.map(r => r.id);

    const [todayBookings, todayRevenue, upcoming, recentReviews] = await Promise.all([
      prisma.booking.count({ where: { restaurantId: { in: ownedIds }, date: { gte: today, lt: tomorrow }, status: { in: ["CONFIRMED","PENDING"] } } }),

      prisma.booking.aggregate({
        where: { restaurantId: { in: ownedIds }, date: { gte: today, lt: tomorrow }, paymentStatus: "PAID" },
        _sum: { totalAmount: true },
      }),

      prisma.booking.findMany({
        where: { restaurantId: { in: ownedIds }, date: { gte: today, lt: in7Days }, status: { in: ["CONFIRMED","PENDING"] } },
        take: 20,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          restaurant: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, phone: true } },
          table: { select: { tableNumber: true, section: true } },
          buffetSession: { select: { name: true } },
          eventHall: { select: { name: true } },
        },
      }),

      prisma.review.findMany({
        where: { restaurantId: { in: ownedIds } },
        take: 10, orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, avatar: true } }, restaurant: { select: { name: true } } },
      }),
    ]);

    // Occupancy by venue type (today)
    const typeBookings = await prisma.booking.groupBy({
      by: ["bookingType"],
      where: { restaurantId: { in: ownedIds }, date: { gte: today, lt: tomorrow }, status: { in: ["CONFIRMED","PENDING"] } },
      _count: { id: true },
    });

    const avgRating = await prisma.review.aggregate({ where: { restaurantId: { in: ownedIds } }, _avg: { rating: true } });

    return reply.send({
      success: true,
      data: {
        restaurants: owned,
        today: {
          bookings: todayBookings,
          revenue: Number(todayRevenue._sum.totalAmount ?? 0),
          byType: Object.fromEntries(typeBookings.map(t => [t.bookingType, t._count.id])),
        },
        upcoming,
        recentReviews,
        averageRating: avgRating._avg.rating ? Math.round(Number(avgRating._avg.rating) * 10) / 10 : null,
      },
    });
  });

  // ── Tables CRUD ───────────────────────────
  fastify.post("/restaurants/:restaurantId/tables",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: string };
      const body = tableCreateSchema.parse(request.body);
      const table = await prisma.table.create({ data: { ...body, restaurantId } });
      return reply.status(201).send({ success: true, data: table });
    }
  );

  fastify.put("/restaurants/:restaurantId/tables/:tableId",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { tableId } = request.params as { restaurantId: string; tableId: string };
      const body = tableCreateSchema.partial().parse(request.body);
      const table = await prisma.table.update({ where: { id: tableId }, data: body });
      return reply.send({ success: true, data: table });
    }
  );

  fastify.delete("/restaurants/:restaurantId/tables/:tableId",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { tableId } = request.params as { restaurantId: string; tableId: string };
      await prisma.table.update({ where: { id: tableId }, data: { isActive: false } });
      return reply.send({ success: true, data: null, message: "Table deactivated" });
    }
  );

  // ── Buffets CRUD ──────────────────────────
  fastify.post("/restaurants/:restaurantId/buffets",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: string };
      const body = buffetCreateSchema.parse(request.body);
      const session = await prisma.buffetSession.create({ data: { ...body, restaurantId } });
      return reply.status(201).send({ success: true, data: session });
    }
  );

  fastify.put("/restaurants/:restaurantId/buffets/:buffetId",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { buffetId } = request.params as { restaurantId: string; buffetId: string };
      const body = buffetCreateSchema.partial().parse(request.body);
      const session = await prisma.buffetSession.update({ where: { id: buffetId }, data: body });
      return reply.send({ success: true, data: session });
    }
  );

  // ── Event Halls CRUD ──────────────────────
  fastify.post("/restaurants/:restaurantId/halls",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: string };
      const body = hallCreateSchema.parse(request.body);
      const hall = await prisma.eventHall.create({ data: { ...body, restaurantId } });
      return reply.status(201).send({ success: true, data: hall });
    }
  );

  fastify.put("/restaurants/:restaurantId/halls/:hallId",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { hallId } = request.params as { restaurantId: string; hallId: string };
      const body = hallCreateSchema.partial().parse(request.body);
      const hall = await prisma.eventHall.update({ where: { id: hallId }, data: body });
      return reply.send({ success: true, data: hall });
    }
  );

  // ── Analytics ─────────────────────────────
  fastify.get("/restaurants/:restaurantId/analytics",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: string };
      const { from, to } = analyticsSchema.parse(request.query);
      const [analytics, heatmap] = await Promise.all([
        getOwnerAnalytics(restaurantId, new Date(from), new Date(to)),
        getPeakHoursHeatmap(restaurantId, new Date(from), new Date(to)),
      ]);
      return reply.send({ success: true, data: { ...analytics, heatmap } });
    }
  );

  // ── Operating Hours ───────────────────────
  fastify.put("/restaurants/:restaurantId/hours",
    { onRequest: [requireRestaurantOwnership] },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: string };
      const hours = hoursSchema.parse(request.body);
      // Upsert each day
      const ops = hours.map(h =>
        prisma.operatingHours.upsert({
          where: { restaurantId_dayOfWeek: { restaurantId, dayOfWeek: h.dayOfWeek } },
          update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
          create: { restaurantId, ...h },
        })
      );
      const result = await prisma.$transaction(ops);
      return reply.send({ success: true, data: result });
    }
  );
}
