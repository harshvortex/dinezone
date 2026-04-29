import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT, requireRole } from "../middleware/auth";
import { createBooking, cancelBooking } from "../services/booking";
import type { JWTPayload } from "../middleware/auth";

const createSchema = z.object({
  restaurantId:    z.string().uuid(),
  bookingType:     z.enum(["TABLE","BUFFET","EVENT_HALL"]),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:       z.string().regex(/^\d{2}:\d{2}$/),
  endTime:         z.string().regex(/^\d{2}:\d{2}$/),
  partySize:       z.number().int().min(1).max(500),
  adultsCount:     z.number().int().optional(),
  childrenCount:   z.number().int().optional(),
  tableId:         z.string().uuid().optional(),
  buffetSessionId: z.string().uuid().optional(),
  eventHallId:     z.string().uuid().optional(),
  eventName:       z.string().max(200).optional(),
  eventType:       z.string().max(100).optional(),
  specialRequests: z.string().max(1000).optional(),
  totalAmount:     z.number().min(0),
  paymentMethod:   z.enum(["ONLINE","AT_VENUE","WALLET"]).default("ONLINE"),
});

const cancelSchema = z.object({ reason: z.string().max(500).optional() });

export async function bookingRoutes(fastify: FastifyInstance) {

  // ── POST /bookings ───────────────────────
  fastify.post("/", { onRequest: [verifyJWT] }, async (request, reply) => {
    const user = request.user as JWTPayload;
    const body = createSchema.parse(request.body);

    try {
      const result = await createBooking({ ...body, userId: user.sub });
      return reply.status(201).send({
        success: true,
        data: {
          booking: result.booking,
          payment: result.razorpayOrder
            ? {
                orderId:   result.razorpayOrder.id,
                amount:    result.razorpayOrder.amount,   // in paise
                currency:  result.razorpayOrder.currency,
                keyId:     process.env["RAZORPAY_KEY_ID"],
              }
            : null,
        },
      });
    } catch (err: any) {
      const status = err.statusCode ?? 500;
      return reply.status(status).send({
        success: false,
        error: { code: err.code ?? "INTERNAL_ERROR", message: err.message },
      });
    }
  });

  // ── GET /bookings/my ─────────────────────
  fastify.get("/my", { onRequest: [verifyJWT] }, async (request, reply) => {
    const user = request.user as JWTPayload;
    const { status, page = "1", limit = "10" } = request.query as Record<string, string>;
    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);

    const where: any = { userId: user.sub };
    if (status) where.status = status;

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where, skip: (p - 1) * l, take: l,
        orderBy: { createdAt: "desc" },
        include: {
          restaurant: { select: { id: true, name: true, city: true, coverImage: true, phone: true } },
          table:        { select: { tableNumber: true, section: true } },
          buffetSession:{ select: { name: true, startTime: true, endTime: true } },
          eventHall:    { select: { name: true } },
          review:       { select: { id: true, rating: true } },
        },
      }),
    ]);

    return reply.send({
      success: true,
      data: bookings,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l), hasNextPage: p * l < total },
    });
  });

  // ── GET /bookings/:id ────────────────────
  fastify.get("/:id", { onRequest: [verifyJWT] }, async (request, reply) => {
    const user = request.user as JWTPayload;
    const { id } = request.params as { id: string };

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        restaurant: true,
        table: true,
        buffetSession: true,
        eventHall: true,
        review: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!booking) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Booking not found" } });

    // User can see own; restaurant owner can see theirs
    const isOwner = booking.userId === user.sub;
    const isRestaurantOwner = user.role === "RESTAURANT_OWNER" || user.role === "ADMIN";
    if (!isOwner && !isRestaurantOwner) {
      return reply.status(403).send({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } });
    }

    return reply.send({ success: true, data: booking });
  });

  // ── PUT /bookings/:id/cancel ─────────────
  fastify.put("/:id/cancel", { onRequest: [verifyJWT] }, async (request, reply) => {
    const user = request.user as JWTPayload;
    const { id } = request.params as { id: string };
    const { reason } = cancelSchema.parse(request.body ?? {});

    try {
      const updated = await cancelBooking(id, user.sub, reason);
      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({
        success: false, error: { code: err.code ?? "INTERNAL_ERROR", message: err.message },
      });
    }
  });

  // ── GET /bookings/restaurant/:restaurantId ─
  fastify.get("/restaurant/:restaurantId", { onRequest: [verifyJWT, requireRole("RESTAURANT_OWNER","ADMIN")] }, async (request, reply) => {
    const user = request.user as JWTPayload;
    const { restaurantId } = request.params as { restaurantId: string };
    const { date, status, bookingType, page = "1", limit = "20" } = request.query as Record<string, string>;
    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);

    // Verify ownership
    if (user.role !== "ADMIN") {
      const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { ownerId: true } });
      if (!restaurant || restaurant.ownerId !== user.sub) {
        return reply.status(403).send({ success: false, error: { code: "FORBIDDEN", message: "Not your restaurant" } });
      }
    }

    const where: any = { restaurantId };
    if (date) where.date = new Date(date);
    if (status) where.status = status;
    if (bookingType) where.bookingType = bookingType;

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where, skip: (p - 1) * l, take: l,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          table: { select: { tableNumber: true, section: true } },
          buffetSession: { select: { name: true } },
          eventHall: { select: { name: true } },
        },
      }),
    ]);

    return reply.send({
      success: true, data: bookings,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    });
  });
}
