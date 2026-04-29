import type { ID, Timestamps, SoftDelete, Address, GeoPoint, OperatingHours, Money } from "./common";

export type CuisineType =
  | "indian"
  | "chinese"
  | "italian"
  | "japanese"
  | "mexican"
  | "thai"
  | "continental"
  | "middle_eastern"
  | "mediterranean"
  | "american"
  | "other";

export type DiningCategory =
  | "fine_dining"
  | "casual"
  | "fast_food"
  | "cafe"
  | "buffet"
  | "food_court"
  | "bar_and_grill"
  | "bakery"
  | "rooftop"
  | "cloud_kitchen";

export type RestaurantStatus = "active" | "inactive" | "temporarily_closed" | "permanently_closed";

export interface Restaurant extends Timestamps, SoftDelete {
  id: ID;
  ownerId: ID;
  name: string;
  slug: string;
  description: string;
  cuisines: CuisineType[];
  category: DiningCategory;
  status: RestaurantStatus;
  address: Address;
  location: GeoPoint; // PostGIS point
  phone: string;
  email: string;
  website?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  imageUrls: string[];
  operatingHours: OperatingHours;
  averageRating: number;
  totalReviews: number;
  totalCapacity: number;
  priceRange: 1 | 2 | 3 | 4;   // $ $$ $$$ $$$$
  hasBuffet: boolean;
  hasEventHall: boolean;
  hasParking: boolean;
  hasValet: boolean;
  isVegOnly: boolean;
  acceptsOnlineBooking: boolean;
  advanceBookingDays: number;   // max days ahead for reservation
  cancellationHours: number;    // hours before booking for free cancellation
  minimumAdvanceMinutes: number;
  tags: string[];
}

export interface CreateRestaurantDto
  extends Omit<
    Restaurant,
    | "id"
    | "ownerId"
    | "slug"
    | "averageRating"
    | "totalReviews"
    | "totalCapacity"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
    | "location"
  > {
  lat: number;
  lng: number;
}

export type UpdateRestaurantDto = Partial<CreateRestaurantDto>;

export interface RestaurantSearchQuery {
  q?: string;                    // name / keyword search
  lat?: number;
  lng?: number;
  radiusMetres?: number;
  cuisines?: CuisineType[];
  category?: DiningCategory;
  priceRange?: (1 | 2 | 3 | 4)[];
  hasBuffet?: boolean;
  hasEventHall?: boolean;
  isVegOnly?: boolean;
  minRating?: number;
  sortBy?: "distance" | "rating" | "price" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
