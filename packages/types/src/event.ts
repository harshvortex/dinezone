import type { ID, Timestamps } from "./common";

export type EventStatus = "draft" | "published" | "sold_out" | "cancelled" | "completed";

export interface RestaurantEvent extends Timestamps {
  id: ID;
  restaurantId: ID;
  hallId?: ID;
  title: string;
  description: string;
  eventDate: Date;
  startTime: string;    // "HH:mm"
  endTime: string;
  ticketPrice: number;  // in paise
  totalTickets: number;
  soldTickets: number;
  coverImageUrl?: string;
  status: EventStatus;
  tags: string[];
}

export interface CreateEventDto
  extends Omit<RestaurantEvent, "id" | "soldTickets" | "createdAt" | "updatedAt"> {}

export type UpdateEventDto = Partial<CreateEventDto>;
