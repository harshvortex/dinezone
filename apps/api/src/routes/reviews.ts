import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const createSchema = z.object({
  restaurantId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  foodRating: z.number().int().min(1).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  ambienceRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

const replySchema = z.object({ reply: z.string().max(1000) });

export async function reviewRoutes(fastify: FastifyInstance) {
  // POST /reviews — create (requires auth)
  fastify.post("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub;
    const body = createSchema.parse(request.body);

    // One review per booking
    if (body.bookingId) {
      const existing = await prisma.review.findUnique({ where: { bookingId: body.bookingId } });
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: "CONFLICT", message: "You have already reviewed this booking." },
        });
      }
      // Verify the booking belongs to the user and is completed
      const booking = await prisma.booking.findFirst({
        where: { id: body.bookingId, userId, status: "COMPLETED" },
      });
      if (!booking) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "You can only review completed bookings." },
        });
      }
    }

    const review = await prisma.review.create({
      data: {
        userId,
        restaurantId: body.restaurantId,
        bookingId: body.bookingId,
        rating: body.rating,
        foodRating: body.foodRating,
        serviceRating: body.serviceRating,
        ambienceRating: body.ambienceRating,
        comment: body.comment,
        isVerified: !!body.bookingId,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    // Recompute restaurant average rating
    const agg = await prisma.review.aggregate({
      where: { restaurantId: body.restaurantId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.restaurant.update({
      where: { id: body.restaurantId },
      data: {
        rating: Number((agg._avg.rating ?? 0).toFixed(1)),
        totalReviews: agg._count.rating,
      },
    });

    return reply.status(201).send({ success: true, data: review });
  });

  // POST /reviews/:id/helpful — mark helpful
  fastify.post("/:id/helpful", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const review = await prisma.review.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    });
    return reply.send({ success: true, data: review });
  });

  // POST /reviews/:id/reply — owner reply
  fastify.post("/:id/reply", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub;
    const { id } = request.params as { id: string };
    const { reply: ownerReply } = replySchema.parse(request.body);

    const review = await prisma.review.findUnique({
      where: { id },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!review) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Review not found" } });
    }
    if (review.restaurant.ownerId !== userId) {
      return reply.status(403).send({ success: false, error: { code: "FORBIDDEN", message: "Only the restaurant owner can reply" } });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { ownerReply, ownerRepliedAt: new Date() },
    });
    return reply.send({ success: true, data: updated });
  });

  // DELETE /reviews/:id — delete own review
  fastify.delete("/:id", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub;
    const { id } = request.params as { id: string };

    const review = await prisma.review.findFirst({ where: { id, userId } });
    if (!review) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Review not found" } });
    }
    await prisma.review.delete({ where: { id } });
    return reply.send({ success: true, data: null });
  });
}
