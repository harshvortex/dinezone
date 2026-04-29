import type { ID, Timestamps, Money } from "./common";

export type HallStatus = "available" | "booked" | "maintenance";
export type EventType =
  | "wedding"
  | "birthday"
  | "corporate"
  | "anniversary"
  | "conference"
  | "social"
  | "other";

export interface EventHall extends Timestamps {
  id: ID;
  restaurantId: ID;
  name: string;
  description: string;
  capacity: number;
  areaSqFt: number;
  floorLevel: number;
  rentalPricePerHour: Money;
  minimumHours: number;
  depositAmount: Money;
  amenities: string[];         // ["Projector", "Sound System", "Stage", "AC"]
  cateringIncluded: boolean;
  externalCateringAllowed: boolean;
  alcoholAllowed: boolean;
  imageUrls: string[];
  currentStatus: HallStatus;
  isActive: boolean;
}

export interface EventBooking extends Timestamps {
  id: ID;
  hallId: ID;
  bookingId: ID;
  eventType: EventType;
  eventName: string;
  hostName: string;
  hostPhone: string;
  guestCount: number;
  startDateTime: Date;
  endDateTime: Date;
  totalAmount: Money;
  depositPaid: boolean;
  specialRequirements?: string;
}

export interface CreateHallDto
  extends Omit<EventHall, "id" | "currentStatus" | "createdAt" | "updatedAt"> {}

export type UpdateHallDto = Partial<CreateHallDto>;
