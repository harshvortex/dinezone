import type { ID, Timestamps, SoftDelete, Money } from "./common";

export type BookingType = "table" | "buffet" | "event_hall";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show"
  | "refunded";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded" | "failed";
export type PaymentMethod = "online" | "at_venue" | "wallet";

export interface Booking extends Timestamps, SoftDelete {
  id: ID;
  referenceCode: string;        // e.g. DS-20240115-7XK9
  userId: ID;
  restaurantId: ID;
  type: BookingType;

  // Table booking
  tableId?: ID;
  seatsRequested?: number;
  seatsConfirmed?: number;

  // Buffet booking
  buffetId?: ID;
  buffetAdults?: number;
  buffetChildren?: number;

  // Event hall booking
  hallId?: ID;
  eventName?: string;
  expectedGuests?: number;

  // Schedule
  bookingDate: Date;
  arrivalTime: string;          // "HH:mm"
  duration?: number;            // minutes

  // Payment
  totalAmount: Money;
  depositAmount: Money;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId?: string;

  // Status
  status: BookingStatus;
  specialRequests?: string;
  internalNotes?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  checkedInAt?: Date;
}

export interface CreateBookingDto {
  restaurantId: ID;
  type: BookingType;
  bookingDate: string;          // "YYYY-MM-DD"
  arrivalTime: string;          // "HH:mm"
  seatsRequested?: number;
  tableId?: ID;
  buffetId?: ID;
  buffetAdults?: number;
  buffetChildren?: number;
  hallId?: ID;
  eventName?: string;
  expectedGuests?: number;
  specialRequests?: string;
  paymentMethod: PaymentMethod;
}

export type UpdateBookingDto = Pick<
  Booking,
  "specialRequests" | "arrivalTime" | "bookingDate"
>;

export interface CancelBookingDto {
  reason: string;
}

export interface BookingSlot {
  time: string;                 // "HH:mm"
  availableSeats: number;
  isAvailable: boolean;
}

export interface AvailabilityQuery {
  restaurantId: ID;
  date: string;                 // "YYYY-MM-DD"
  guests: number;
  type?: BookingType;
}
