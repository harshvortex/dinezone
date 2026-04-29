/** Format a number as Indian Rupee currency string */
export function formatINR(amount: number, compact = false): string {
  if (compact && amount >= 100_000) {
    return `₹${(amount / 100_000).toFixed(1)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a decimal stored as paise (smallest unit) into rupees */
export function paisaToRupee(paise: number): number {
  return paise / 100;
}

/** Format price range enum into readable symbols */
export function formatPriceRange(range: string): string {
  const map: Record<string, string> = {
    BUDGET: "₹",
    MODERATE: "₹₹",
    EXPENSIVE: "₹₹₹",
    LUXURY: "₹₹₹₹",
  };
  return map[range] ?? range;
}

/** Format a rating number to 1 decimal */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Format a date to "Mon, 15 Jun 2025" */
export function formatBookingDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Format "HH:MM" 24h to "9:30 AM" */
export function formatTime(time: string): string {
  const [hourStr = "0", minStr = "0"] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(min).padStart(2, "0")} ${period}`;
}

/** Truncate text with ellipsis */
export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : `${str.slice(0, maxLen - 3)}...`;
}

/** Convert snake_case / SCREAMING_SNAKE to Title Case */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
