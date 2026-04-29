import Razorpay from "razorpay";
import { createHmac } from "crypto";
import { prisma } from "../lib/prisma";
import { getAvailability } from "./availability";
import { invalidateRestaurantCache } from "./cache";
import { emitAvailabilityUpdate, emitBookingConfirmed, emitBookingCancelled } from "./realtime";
import { sendBookingConfirmationSMS, sendBookingCancellationSMS, createInAppNotification } from "./notifications";

export const razorpay = new Razorpay({
  key_id:     process.env["RAZORPAY_KEY_ID"]     ?? "",
  key_secret: process.env["RAZORPAY_KEY_SECRET"] ?? "",
});

export interface CreateBookingInput {
  userId: string;
  restaurantId: string;
  bookingType: "TABLE" | "BUFFET" | "EVENT_HALL";
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  adultsCount?: number;
  childrenCount?: number;
  tableId?: string;
  buffetSessionId?: string;
  eventHallId?: string;
  eventName?: string;
  eventType?: string;
  specialRequests?: string;
  totalAmount: number;
  paymentMethod: "ONLINE" | "AT_VENUE" | "WALLET";
}

function generateRef(): string {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  return `DS-${ds}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

// ── 1. createBooking ─────────────────────
export async function createBooking(input: CreateBookingInput) {
  // Re-validate availability
  const availability = await getAvailability(input.restaurantId, input.bookingType, input.date, input.partySize);

  if (input.bookingType === "TABLE" && input.tableId) {
    const slots = availability as Array<{ tableId: string; time: string; isAvailable: boolean }>;
    const ok = slots.find(s => s.tableId === input.tableId && s.time === input.startTime && s.isAvailable);
    if (!ok) throw Object.assign(new Error("Selected table slot is no longer available"), { code: "SLOT_UNAVAILABLE", statusCode: 409 });
  }

  if (input.bookingType === "BUFFET" && input.buffetSessionId) {
    const sessions = availability as Array<{ sessionId: string; isAvailable: boolean; availableSeats: number }>;
    const s = sessions.find(s => s.sessionId === input.buffetSessionId);
    if (!s || !s.isAvailable || s.availableSeats < input.partySize) {
      throw Object.assign(new Error("Buffet session is fully booked"), { code: "SLOT_UNAVAILABLE", statusCode: 409 });
    }
  }

  // Create Razorpay order
  let razorpayOrder: { id: string; amount: number; currency: string } | null = null;
  if (input.paymentMethod === "ONLINE" && input.totalAmount > 0) {
    razorpayOrder = await razorpay.orders.create({
      amount: Math.round(input.totalAmount * 100),
      currency: "INR",
      receipt: generateRef(),
      notes: { restaurantId: input.restaurantId, userId: input.userId, date: input.date },
    }) as any;
  }

  const booking = await prisma.$transaction(async (tx) => {
    return tx.booking.create({
      data: {
        referenceCode: generateRef(),
        userId: input.userId,
        restaurantId: input.restaurantId,
        bookingType: input.bookingType,
        tableId: input.tableId,
        buffetSessionId: input.buffetSessionId,
        eventHallId: input.eventHallId,
        eventName: input.eventName,
        eventType: input.eventType,
        date: new Date(input.date),
        startTime: input.startTime,
        endTime: input.endTime,
        partySize: input.partySize,
        adultsCount: input.adultsCount,
        childrenCount: input.childrenCount,
        totalAmount: input.totalAmount,
        currency: "INR",
        paymentStatus: "UNPAID",
        paymentMethod: input.paymentMethod,
        paymentId: razorpayOrder?.id ?? null,
        status: input.paymentMethod === "AT_VENUE" ? "CONFIRMED" : "PENDING",
        specialRequests: input.specialRequests,
      },
      include: {
        restaurant: { select: { id: true, name: true, address: true, city: true, phone: true, slug: true } },
        table: { select: { tableNumber: true, section: true } },
        buffetSession: { select: { name: true, startTime: true, endTime: true } },
        eventHall: { select: { name: true } },
      },
    });
  });

  if (input.paymentMethod === "AT_VENUE") {
    await _postConfirmActions(booking, null);
  }

  return { booking, razorpayOrder };
}

// ── 2. confirmBooking ────────────────────
export async function confirmBooking(bookingId: string, razorpayPaymentId: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED", paymentStatus: "PAID", paymentId: razorpayPaymentId },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      restaurant: { select: { id: true, name: true, address: true, city: true, slug: true } },
      table: { select: { tableNumber: true } },
      buffetSession: { select: { name: true } },
      eventHall: { select: { name: true } },
    },
  });
  await _postConfirmActions(booking, razorpayPaymentId);
  return booking;
}

// ── 3. cancelBooking ─────────────────────
export async function cancelBooking(bookingId: string, requestingUserId: string, reason?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      restaurant: { select: { id: true, name: true, address: true, slug: true } },
    },
  });

  if (!booking) throw Object.assign(new Error("Booking not found"), { statusCode: 404 });
  if (booking.userId !== requestingUserId) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  if (["CANCELLED","COMPLETED"].includes(booking.status)) throw Object.assign(new Error("Cannot cancel"), { statusCode: 400 });

  const bookingDateTime = new Date(`${booking.date.toISOString().split("T")[0]}T${booking.startTime}:00`);
  const hoursUntil = (bookingDateTime.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < 2) throw Object.assign(new Error("Cancellation window has passed (must be 2h+ before booking)"), { statusCode: 400 });

  let refundAmount: number | undefined;
  if (booking.paymentStatus === "PAID" && booking.paymentId) {
    try {
      await razorpay.payments.refund(booking.paymentId, {
        amount: Math.round(Number(booking.totalAmount) * 100),
        notes: { bookingId, reason: reason ?? "Customer cancellation" },
      });
      refundAmount = Number(booking.totalAmount);
      await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "REFUNDED" } });
    } catch (err) {
      console.error("[Refund] Error:", err);
    }
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancellationReason: reason ?? null, cancelledAt: new Date() },
  });

  await invalidateRestaurantCache(booking.restaurantId, booking.restaurant?.slug);

  const dateStr = booking.date.toISOString().split("T")[0]!;
  const avail = await getAvailability(booking.restaurantId, booking.bookingType, dateStr, booking.partySize);
  emitAvailabilityUpdate(booking.restaurantId, dateStr, booking.bookingType, avail as any);
  emitBookingCancelled({ restaurantId: booking.restaurantId, bookingId: booking.id, referenceCode: booking.referenceCode, bookingType: booking.bookingType, date: dateStr, partySize: booking.partySize });

  if (booking.user.phone) {
    await sendBookingCancellationSMS(booking.user.phone, {
      referenceCode: booking.referenceCode,
      restaurantName: booking.restaurant?.name ?? "",
      restaurantAddress: booking.restaurant?.address ?? "",
      date: booking.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      time: booking.startTime,
      partySize: booking.partySize,
      bookingType: booking.bookingType,
      refundAmount,
    });
  }

  await createInAppNotification(booking.userId, "BOOKING_CANCELLED", "Booking Cancelled",
    `Your booking at ${booking.restaurant?.name} was cancelled.${refundAmount ? ` Refund of ₹${refundAmount} initiated.` : ""}`,
    { bookingId, refundAmount }
  );

  return updated;
}

// ── Signature verification ────────────────
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env["RAZORPAY_KEY_SECRET"] ?? "";
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return expected === signature;
}

// ── Internal post-confirm ─────────────────
async function _postConfirmActions(booking: any, paymentId: string | null) {
  await invalidateRestaurantCache(booking.restaurantId, booking.restaurant?.slug);
  try {
    const dateStr = booking.date.toISOString().split("T")[0]!;
    const avail = await getAvailability(booking.restaurantId, booking.bookingType, dateStr, booking.partySize);
    emitAvailabilityUpdate(booking.restaurantId, dateStr, booking.bookingType, avail as any);
  } catch { /* non-fatal */ }

  emitBookingConfirmed({
    restaurantId: booking.restaurantId, bookingId: booking.id, referenceCode: booking.referenceCode,
    bookingType: booking.bookingType, tableId: booking.tableId, buffetSessionId: booking.buffetSessionId,
    hallId: booking.eventHallId, date: booking.date.toISOString().split("T")[0]!, partySize: booking.partySize,
  });

  if (booking.user?.phone) {
    await sendBookingConfirmationSMS(booking.user.phone, {
      referenceCode: booking.referenceCode,
      restaurantName: booking.restaurant?.name ?? "",
      restaurantAddress: `${booking.restaurant?.address ?? ""}, ${booking.restaurant?.city ?? ""}`,
      date: booking.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      time: booking.startTime,
      partySize: booking.partySize,
      bookingType: booking.bookingType,
      totalAmount: paymentId ? Number(booking.totalAmount) : undefined,
    });
  }

  await createInAppNotification(booking.userId, "BOOKING_CONFIRMED", "Booking Confirmed! 🎉",
    `Your booking at ${booking.restaurant?.name} is confirmed. Ref: ${booking.referenceCode}`,
    { bookingId: booking.id, restaurantId: booking.restaurantId }
  );
}
