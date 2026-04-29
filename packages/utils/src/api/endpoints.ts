import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
  Restaurant,
  RestaurantSearchQuery,
  PaginatedResponse,
  Booking,
  CreateBookingDto,
  AvailabilityQuery,
  BookingSlot,
  Review,
  CreateReviewDto,
  User,
  UpdateUserDto,
  Buffet,
  EventHall,
  HealthCheckResponse,
} from "@dinespot/types";
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
export const authApi = {
  login: (dto: LoginDto) =>
    apiPost<AuthResponse>("/auth/login", dto),

  register: (dto: RegisterDto) =>
    apiPost<AuthResponse>("/auth/register", dto),

  logout: () =>
    apiPost<void>("/auth/logout"),

  me: () =>
    apiGet<User>("/auth/me"),

  forgotPassword: (email: string) =>
    apiPost<void>("/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    apiPost<void>("/auth/reset-password", { token, password }),
};

// ─────────────────────────────────────────
// RESTAURANTS
// ─────────────────────────────────────────
export const restaurantApi = {
  search: (query: RestaurantSearchQuery) =>
    apiGet<PaginatedResponse<Restaurant>>("/restaurants", query as unknown as Record<string, unknown>),

  getById: (id: string) =>
    apiGet<Restaurant>(`/restaurants/${id}`),

  getBySlug: (slug: string) =>
    apiGet<Restaurant>(`/restaurants/slug/${slug}`),

  getNearby: (lat: number, lng: number, radiusMetres = 5000) =>
    apiGet<Restaurant[]>("/restaurants/nearby", { lat, lng, radiusMetres }),

  getBuffets: (restaurantId: string) =>
    apiGet<Buffet[]>(`/restaurants/${restaurantId}/buffets`),

  getEventHalls: (restaurantId: string) =>
    apiGet<EventHall[]>(`/restaurants/${restaurantId}/halls`),

  getReviews: (restaurantId: string, page = 1, limit = 20) =>
    apiGet<PaginatedResponse<Review>>(`/restaurants/${restaurantId}/reviews`, {
      page,
      limit,
    }),
};

// ─────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────
export const availabilityApi = {
  getSlots: (query: AvailabilityQuery) =>
    apiGet<BookingSlot[]>("/availability/slots", query as unknown as Record<string, unknown>),

  checkBuffet: (buffetSessionId: string, date: string) =>
    apiGet<{ availableSeats: number; isAvailable: boolean }>(
      `/availability/buffet/${buffetSessionId}`,
      { date }
    ),

  checkHall: (hallId: string, date: string) =>
    apiGet<{ isAvailable: boolean }>(`/availability/hall/${hallId}`, { date }),
};

// ─────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────
export const bookingApi = {
  create: (dto: CreateBookingDto) =>
    apiPost<Booking>("/bookings", dto),

  getMyBookings: (status?: string, page = 1, limit = 10) =>
    apiGet<PaginatedResponse<Booking>>("/bookings/me", { status, page, limit }),

  getById: (id: string) =>
    apiGet<Booking>(`/bookings/${id}`),

  cancel: (id: string, reason: string) =>
    apiPatch<Booking>(`/bookings/${id}/cancel`, { reason }),
};

// ─────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────
export const reviewApi = {
  create: (dto: CreateReviewDto) =>
    apiPost<Review>("/reviews", dto),

  markHelpful: (reviewId: string) =>
    apiPost<void>(`/reviews/${reviewId}/helpful`),
};

// ─────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────
export const userApi = {
  getProfile: () =>
    apiGet<User>("/users/me"),

  updateProfile: (dto: UpdateUserDto) =>
    apiPatch<User>("/users/me", dto),

  deleteAccount: () =>
    apiDelete<void>("/users/me"),

  getMyReviews: () =>
    apiGet<Review[]>("/users/me/reviews"),
};

// ─────────────────────────────────────────
// SYSTEM
// ─────────────────────────────────────────
export const systemApi = {
  health: () =>
    apiGet<HealthCheckResponse>("/health"),
};
