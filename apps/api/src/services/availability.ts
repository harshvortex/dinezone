import { prisma } from "../lib/prisma";
import { hasTimeConflict } from "@dinespot/utils";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface TimeSlot {
  time: string;          // "HH:MM"
  endTime: string;       // "HH:MM"
  tableId: string;
  tableNumber: string;
  section: string | null;
  capacity: number;
  isAvailable: boolean;
}

export interface BuffetAvailability {
  sessionId: string;
  name: string;
  startTime: string;
  endTime: string;
  pricePerHead: number;
  childPrice: number | null;
  maxCapacity: number;
  bookedCount: number;
  availableSeats: number;
  isAvailable: boolean;
}

export interface HallAvailability {
  hallId: string;
  name: string;
  capacity: number;
  pricePerDay: number;
  amenities: string[];
  isAvailable: boolean;
  unavailableDates: string[];
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function toMinutes(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateHourlySlots(openTime: string, closeTime: string): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  const open = toMinutes(openTime);
  // Stop creating slots 1 hour before closing to allow for full dining
  const close = toMinutes(closeTime) - 60;
  for (let t = open; t <= close; t += 60) {
    slots.push({ start: minutesToTime(t), end: minutesToTime(t + 60) });
  }
  return slots;
}

const DAY_MAP: Record<number, string> = {
  0: "SUNDAY", 1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY",
  4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
};

// ─────────────────────────────────────────
// 1. Table Availability
// ─────────────────────────────────────────
export async function getTableAvailability(
  restaurantId: string,
  date: string,
  partySize: number
): Promise<TimeSlot[]> {
  const bookingDate = new Date(date);
  const dayOfWeek = DAY_MAP[bookingDate.getDay()];

  // Get operating hours for the day
  const hours = await prisma.operatingHours.findFirst({
    where: { restaurantId, dayOfWeek: dayOfWeek as any, isClosed: false },
  });

  if (!hours) return []; // restaurant closed that day

  // Get active tables that fit the party size
  const tables = await prisma.table.findMany({
    where: {
      restaurantId,
      isActive: true,
      capacity: { gte: partySize },
    },
    include: {
      bookings: {
        where: {
          date: bookingDate,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { startTime: true, endTime: true },
      },
    },
    orderBy: [{ capacity: "asc" }, { tableNumber: "asc" }],
  });

  // Generate 1-hour slots for each table
  const hourlySlots = generateHourlySlots(hours.openTime, hours.closeTime);
  const result: TimeSlot[] = [];

  for (const table of tables) {
    for (const slot of hourlySlots) {
      const isConflict = table.bookings.some((b) =>
        hasTimeConflict(b.startTime, b.endTime, slot.start, slot.end)
      );

      result.push({
        time: slot.start,
        endTime: slot.end,
        tableId: table.id,
        tableNumber: table.tableNumber,
        section: table.section,
        capacity: table.capacity,
        isAvailable: !isConflict,
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────
// 2. Buffet Availability
// ─────────────────────────────────────────
export async function getBuffetAvailability(
  restaurantId: string,
  date: string
): Promise<BuffetAvailability[]> {
  const bookingDate = new Date(date);

  const sessions = await prisma.buffetSession.findMany({
    where: { restaurantId, isActive: true },
    include: {
      bookings: {
        where: {
          date: bookingDate,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { partySize: true },
      },
    },
  });

  return sessions.map((s) => {
    const bookedCount = s.bookings.reduce((sum, b) => sum + b.partySize, 0);
    const availableSeats = s.maxCapacity - bookedCount;

    return {
      sessionId: s.id,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      pricePerHead: Number(s.pricePerHead),
      childPrice: s.childPrice ? Number(s.childPrice) : null,
      maxCapacity: s.maxCapacity,
      bookedCount,
      availableSeats: Math.max(0, availableSeats),
      isAvailable: availableSeats > 0,
    };
  });
}

// ─────────────────────────────────────────
// 3. Event Hall Availability
// ─────────────────────────────────────────
export async function getEventHallAvailability(
  restaurantId: string,
  startDate: string,
  endDate?: string
): Promise<HallAvailability[]> {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);

  const halls = await prisma.eventHall.findMany({
    where: { restaurantId, isActive: true },
    include: {
      bookings: {
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          date: { gte: start, lte: end },
        },
        select: { date: true },
      },
    },
  });

  return halls.map((h) => {
    const unavailableDates = h.bookings.map((b) =>
      b.date.toISOString().split("T")[0] ?? ""
    );
    const isAvailable = h.bookings.length === 0;

    return {
      hallId: h.id,
      name: h.name,
      capacity: h.capacity,
      pricePerDay: Number(h.pricePerDay),
      amenities: h.amenities,
      isAvailable,
      unavailableDates,
    };
  });
}

// ─────────────────────────────────────────
// 4. Unified availability dispatcher
// ─────────────────────────────────────────
export async function getAvailability(
  restaurantId: string,
  type: "TABLE" | "BUFFET" | "EVENT_HALL",
  date: string,
  partySize = 2,
  endDate?: string
): Promise<TimeSlot[] | BuffetAvailability[] | HallAvailability[]> {
  switch (type) {
    case "TABLE":
      return getTableAvailability(restaurantId, date, partySize);
    case "BUFFET":
      return getBuffetAvailability(restaurantId, date);
    case "EVENT_HALL":
      return getEventHallAvailability(restaurantId, date, endDate);
  }
}
