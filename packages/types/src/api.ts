import type { ID } from "./common";

// ─────────────────────────────────────────
// Generic API Response wrappers
// ─────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>; // field-level validation errors
    requestId?: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────
// Well-known error codes
// ─────────────────────────────────────────

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "BOOKING_CONFLICT"
  | "SLOT_UNAVAILABLE"
  | "PAYMENT_FAILED"
  | "RESTAURANT_CLOSED";

// ─────────────────────────────────────────
// Health check
// ─────────────────────────────────────────

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  uptime: number;
  services: {
    database: "ok" | "error";
    redis: "ok" | "error";
  };
}
