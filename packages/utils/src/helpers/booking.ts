import type { BookingType } from "@dinespot/types";

/** Generate a DineSpot booking reference code e.g. DS-20240615-X7K2 */
export function generateReferenceCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DS-${dateStr}-${rand}`;
}

/** Returns booking type label for display */
export function getBookingTypeLabel(type: BookingType): string {
  const labels: Record<BookingType, string> = {
    table: "Table Reservation",
    buffet: "Buffet Booking",
    event_hall: "Event Hall Booking",
  };
  return labels[type];
}

/** Check if a time slot conflicts with an existing booking */
export function hasTimeConflict(
  existingStart: string,
  existingEnd: string,
  newStart: string,
  newEnd: string
): boolean {
  const toMinutes = (t: string) => {
    const [h = 0, m = 0] = t.split(":").map(Number);
    return (h as number) * 60 + (m as number);
  };
  const es = toMinutes(existingStart);
  const ee = toMinutes(existingEnd);
  const ns = toMinutes(newStart);
  const ne = toMinutes(newEnd);
  return ns < ee && ne > es;
}

/** Returns number of minutes between two "HH:MM" strings */
export function durationMinutes(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h = 0, m = 0] = t.split(":").map(Number);
    return (h as number) * 60 + (m as number);
  };
  return toMin(end) - toMin(start);
}
