// ─────────────────────────────────────────
// Common / shared primitives
// ─────────────────────────────────────────

export type ID = string; // UUID v4

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDelete {
  deletedAt: Date | null;
}

/** GeoJSON Point compatible with PostGIS */
export interface GeoPoint {
  type: "Point";
  coordinates: [longitude: number, latitude: number];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export type SortOrder = "asc" | "desc";

export interface NearbyQuery extends PaginationQuery {
  lat: number;
  lng: number;
  radiusMetres?: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  lat: number;
  lng: number;
}

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

export interface Money {
  amount: number; // in smallest unit (paise / cents)
  currency: CurrencyCode;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface TimeRange {
  open: string;  // "HH:mm" 24h
  close: string; // "HH:mm" 24h
}

export type OperatingHours = Record<DayOfWeek, TimeRange | null>;
