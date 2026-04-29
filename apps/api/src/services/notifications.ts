import twilio from "twilio";
import { prisma } from "../lib/prisma";
import type { NotificationType } from "@prisma/client";

// ─────────────────────────────────────────
// Twilio client (Lazy initialization)
// ─────────────────────────────────────────
let _twilioClient: any = null;

function getTwilioClient() {
  if (_twilioClient) return _twilioClient;
  
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  
  if (!sid || sid === "" || sid === "REPLACE_ME" || !sid.startsWith("AC")) {
    return null;
  }
  
  _twilioClient = twilio(sid, token ?? "");
  return _twilioClient;
}

const FROM_NUMBER = process.env["TWILIO_PHONE_NUMBER"] ?? "";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface BookingSMSDetails {
  referenceCode: string;
  restaurantName: string;
  restaurantAddress: string;
  date: string;           // "15 Jul 2025"
  time: string;           // "7:30 PM"
  partySize: number;
  bookingType: string;
  totalAmount?: number;
}

// ─────────────────────────────────────────
// 1. Booking confirmation SMS
// ─────────────────────────────────────────
export async function sendBookingConfirmationSMS(
  phone: string,
  details: BookingSMSDetails
): Promise<void> {
  const amtLine = details.totalAmount
    ? `\nAmount: ₹${details.totalAmount.toLocaleString("en-IN")}`
    : "";

  const body =
    `✅ Booking Confirmed! [DineSpot]\n` +
    `Ref: ${details.referenceCode}\n` +
    `📍 ${details.restaurantName}\n` +
    `${details.restaurantAddress}\n` +
    `📅 ${details.date} at ${details.time}\n` +
    `👥 Party of ${details.partySize}` +
    amtLine +
    `\n\nShow this SMS at the venue. Need help? support@dinespot.app`;

  await safeSend(phone, body);
}

// ─────────────────────────────────────────
// 2. Booking cancellation SMS
// ─────────────────────────────────────────
export async function sendBookingCancellationSMS(
  phone: string,
  details: BookingSMSDetails & { refundAmount?: number }
): Promise<void> {
  const refundLine = details.refundAmount
    ? `\nRefund of ₹${details.refundAmount.toLocaleString("en-IN")} will be credited in 5–7 business days.`
    : "";

  const body =
    `❌ Booking Cancelled [DineSpot]\n` +
    `Ref: ${details.referenceCode}\n` +
    `${details.restaurantName} — ${details.date} at ${details.time}` +
    refundLine +
    `\n\nRebook anytime at dinespot.app`;

  await safeSend(phone, body);
}

// ─────────────────────────────────────────
// 3. Booking reminder SMS (send 2h before)
// ─────────────────────────────────────────
export async function sendBookingReminderSMS(
  phone: string,
  details: BookingSMSDetails
): Promise<void> {
  const body =
    `⏰ Reminder [DineSpot]\n` +
    `Your booking at ${details.restaurantName} is in 2 hours!\n` +
    `📅 ${details.date} at ${details.time} · ${details.partySize} guests\n` +
    `Ref: ${details.referenceCode}`;

  await safeSend(phone, body);
}

// ─────────────────────────────────────────
// 4. OTP SMS (for phone login)
// ─────────────────────────────────────────
export async function sendOTPSMS(phone: string, otp: string): Promise<void> {
  const body = `${otp} is your DineSpot OTP. Valid for 10 minutes. Do not share this code.`;
  await safeSend(phone, body);
}

// ─────────────────────────────────────────
// 5. In-app notification (Notification table)
// ─────────────────────────────────────────
export async function createInAppNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, message, data: data ?? {} },
  });
}

// ─────────────────────────────────────────
// 6. Batch unread count
// ─────────────────────────────────────────
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

// ─────────────────────────────────────────
// Safe send — logs but doesn't throw
// ─────────────────────────────────────────
async function safeSend(to: string, body: string): Promise<void> {
  const client = getTwilioClient();
  
  if (!client) {
    console.info(`[SMS mock] To: ${to}\n${body}`);
    return;
  }
  
  try {
    await client.messages.create({ from: FROM_NUMBER, to, body });
  } catch (err) {
    console.error(`[SMS] Failed to send to ${to}:`, err);
    // Non-fatal — booking is still confirmed even if SMS fails
  }
}
