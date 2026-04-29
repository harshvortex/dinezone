import type { ID, Timestamps, Money } from "./common";

export type BuffetType = "veg" | "non_veg" | "vegan" | "mixed";
export type BuffetMeal = "breakfast" | "brunch" | "lunch" | "dinner" | "all_day";

export interface Buffet extends Timestamps {
  id: ID;
  restaurantId: ID;
  name: string;
  description: string;
  type: BuffetType;
  meal: BuffetMeal;
  adultPrice: Money;
  childPrice: Money;        // e.g. kids 5–12 years
  childFreeUnderAge: number; // e.g. under 5 are free
  startTime: string;        // "HH:mm"
  endTime: string;
  totalSeats: number;
  bookedSeats: number;
  imageUrls: string[];
  highlights: string[];     // ["Live Chaat Station", "Dessert Corner"]
  isActive: boolean;
  availableDays: string[];  // ["monday","friday","saturday","sunday"]
}

export interface CreateBuffetDto
  extends Omit<Buffet, "id" | "bookedSeats" | "createdAt" | "updatedAt"> {}

export type UpdateBuffetDto = Partial<CreateBuffetDto>;
