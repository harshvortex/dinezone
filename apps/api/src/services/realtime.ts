import type { Server as SocketIOServer } from "socket.io";
import type {
  TimeSlot,
  BuffetAvailability,
  HallAvailability,
} from "./availability";

// ─────────────────────────────────────────
// Singleton io reference
// ─────────────────────────────────────────
let ioInstance: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  ioInstance = io;
}

function getIO(): SocketIOServer {
  if (!ioInstance) throw new Error("Socket.IO not initialized");
  return ioInstance;
}

// ─────────────────────────────────────────
// Room naming convention
// ─────────────────────────────────────────
const restaurantRoom = (id: string) => `restaurant:${id}`;

// ─────────────────────────────────────────
// Event names (typed constants)
// ─────────────────────────────────────────
export const SocketEvent = {
  AVAILABILITY_UPDATE: "availability:update",
  BOOKING_CONFIRMED:   "booking:confirmed",
  BOOKING_CANCELLED:   "booking:cancelled",
  SEAT_COUNT_UPDATE:   "seats:update",
} as const;

export type SocketEventName = (typeof SocketEvent)[keyof typeof SocketEvent];

// ─────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────
export interface AvailabilityUpdatePayload {
  restaurantId: string;
  date: string;
  type: "TABLE" | "BUFFET" | "EVENT_HALL";
  availability: TimeSlot[] | BuffetAvailability[] | HallAvailability[];
  updatedAt: string;
}

export interface BookingEventPayload {
  restaurantId: string;
  bookingId: string;
  referenceCode: string;
  bookingType: "TABLE" | "BUFFET" | "EVENT_HALL";
  tableId?: string;
  buffetSessionId?: string;
  hallId?: string;
  date: string;
  partySize: number;
}

export interface SeatCountPayload {
  restaurantId: string;
  tableId: string;
  date: string;
  isNowBooked: boolean;
}

// ─────────────────────────────────────────
// 1. joinRestaurantRoom — handled on client side
//    Server-side, we just register the socket event
// ─────────────────────────────────────────
export function registerSocketEvents(io: SocketIOServer) {
  io.on("connection", (socket) => {
    // Client joins a restaurant's real-time room
    socket.on("join:restaurant", (restaurantId: string) => {
      if (typeof restaurantId !== "string" || !restaurantId) return;
      socket.join(restaurantRoom(restaurantId));
      socket.emit("joined", { room: restaurantRoom(restaurantId) });
    });

    // Client leaves the room (e.g. navigating away)
    socket.on("leave:restaurant", (restaurantId: string) => {
      socket.leave(restaurantRoom(restaurantId));
    });

    // Ping/pong for connection health
    socket.on("ping", () => socket.emit("pong", { ts: Date.now() }));
  });
}

// ─────────────────────────────────────────
// 2. emitAvailabilityUpdate
// ─────────────────────────────────────────
export function emitAvailabilityUpdate(
  restaurantId: string,
  date: string,
  type: "TABLE" | "BUFFET" | "EVENT_HALL",
  availability: TimeSlot[] | BuffetAvailability[] | HallAvailability[]
) {
  try {
    const payload: AvailabilityUpdatePayload = {
      restaurantId,
      date,
      type,
      availability,
      updatedAt: new Date().toISOString(),
    };
    getIO()
      .to(restaurantRoom(restaurantId))
      .emit(SocketEvent.AVAILABILITY_UPDATE, payload);
  } catch { /* silent if io not ready */ }
}

// ─────────────────────────────────────────
// 3. emitBookingConfirmed
// ─────────────────────────────────────────
export function emitBookingConfirmed(payload: BookingEventPayload) {
  try {
    getIO()
      .to(restaurantRoom(payload.restaurantId))
      .emit(SocketEvent.BOOKING_CONFIRMED, payload);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────
// 4. emitBookingCancelled
// ─────────────────────────────────────────
export function emitBookingCancelled(payload: BookingEventPayload) {
  try {
    getIO()
      .to(restaurantRoom(payload.restaurantId))
      .emit(SocketEvent.BOOKING_CANCELLED, payload);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────
// 5. emitSeatCountUpdate — lightweight single-table status
// ─────────────────────────────────────────
export function emitSeatCountUpdate(payload: SeatCountPayload) {
  try {
    getIO()
      .to(restaurantRoom(payload.restaurantId))
      .emit(SocketEvent.SEAT_COUNT_UPDATE, payload);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────
// 6. Get connected client count in a room
// ─────────────────────────────────────────
export async function getRoomSize(restaurantId: string): Promise<number> {
  try {
    const sockets = await getIO()
      .in(restaurantRoom(restaurantId))
      .fetchSockets();
    return sockets.length;
  } catch {
    return 0;
  }
}
