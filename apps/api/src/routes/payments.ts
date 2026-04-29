import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHmac } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT, requireRole } from "../middleware/auth";
import { razorpay, confirmBooking, verifyRazorpaySignature } from "../services/booking";

const verifySchema = z.object({
  razorpay_order_id:   z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature:  z.string(),
  bookingId:           z.string().uuid(),
});

const refundSchema = z.object({
  bookingId: z.string().uuid(),
  reason:    z.string().optional(),
});

export async function paymentRoutes(fastify: FastifyInstance) {

  // ── POST /payments/verify ─────────────────
  fastify.post("/verify", async (request, reply) => {
    const body = verifySchema.parse(request.body);

    // 1. Verify Razorpay HMAC signature
    const isValid = verifyRazorpaySignature(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature
    );

    if (!isValid) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_SIGNATURE", message: "Payment signature verification failed" },
      });
    }

    // 2. Confirm booking
    try {
      const booking = await confirmBooking(body.bookingId, body.razorpay_payment_id);
      return reply.send({ success: true, data: { booking, message: "Payment verified and booking confirmed" } });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: "CONFIRM_FAILED", message: err.message },
      });
    }
  });

  // ── POST /payments/refund ─────────────────
  fastify.post("/refund", { onRequest: [verifyJWT, requireRole("ADMIN")] }, async (request, reply) => {
    const { bookingId, reason } = refundSchema.parse(request.body);

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Booking not found" } });

    if (booking.paymentStatus !== "PAID" || !booking.paymentId) {
      return reply.status(400).send({ success: false, error: { code: "BAD_REQUEST", message: "Booking has no completed payment" } });
    }

    // Razorpay refund — uses Razorpay Payment ID (not order ID)
    const refund = await razorpay.payments.refund(booking.paymentId, {
      amount: Math.round(Number(booking.totalAmount) * 100),
      speed: "normal",
      notes: { bookingId, reason: reason ?? "Admin initiated refund" },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: "REFUNDED", status: "CANCELLED", cancellationReason: reason ?? "Admin refund" },
    });

    return reply.send({ success: true, data: { refundId: (refund as any).id, amount: Number(booking.totalAmount), message: "Refund initiated" } });
  });

  // ── POST /payments/webhook ────────────────
  // Register with Razorpay Dashboard: Settings → Webhooks → Add URL
  fastify.post("/webhook", {
    config: { rawBody: true }, // need raw body for signature verification
  }, async (request: FastifyRequest & { rawBody?: Buffer }, reply) => {
    const signature = request.headers["x-razorpay-signature"] as string;
    const secret    = process.env["RAZORPAY_WEBHOOK_SECRET"] ?? "";
    const rawBody   = request.rawBody?.toString() ?? JSON.stringify(request.body);

    // Verify webhook signature
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (expected !== signature) {
      return reply.status(400).send({ success: false, error: { code: "INVALID_WEBHOOK", message: "Webhook signature mismatch" } });
    }

    const event = request.body as { event: string; payload: Record<string, any> };
    fastify.log.info(`[Webhook] Received: ${event.event}`);

    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload.payment?.entity;
        const orderId = payment?.order_id;
        if (!orderId) break;

        // Find booking by Razorpay order ID stored in paymentId (temporarily)
        const booking = await prisma.booking.findFirst({
          where: { paymentId: orderId, status: "PENDING" },
        });
        if (booking) {
          await confirmBooking(booking.id, payment.id);
          fastify.log.info(`[Webhook] Booking confirmed: ${booking.referenceCode}`);
        }
        break;
      }

      case "payment.failed": {
        const payment = event.payload.payment?.entity;
        const orderId = payment?.order_id;
        if (orderId) {
          await prisma.booking.updateMany({
            where: { paymentId: orderId, status: "PENDING" },
            data: { status: "CANCELLED", paymentStatus: "FAILED" },
          });
          fastify.log.warn(`[Webhook] Payment failed for order: ${orderId}`);
        }
        break;
      }

      case "refund.processed": {
        const refund = event.payload.refund?.entity;
        fastify.log.info(`[Webhook] Refund processed: ${refund?.id}`);
        break;
      }

      default:
        fastify.log.info(`[Webhook] Unhandled event: ${event.event}`);
    }

    return reply.send({ success: true });
  });
}
