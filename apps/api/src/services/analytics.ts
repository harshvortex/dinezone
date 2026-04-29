import { prisma } from "../lib/prisma";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface DailyRevenue {
  date: string;
  revenue: number;
  bookings: number;
}

export interface BookingsByType {
  TABLE: number;
  BUFFET: number;
  EVENT_HALL: number;
}

export interface PeakHoursMatrix {
  // 7 rows (Mon–Sun) × 24 cols (0–23h) — value = booking count
  matrix: number[][];
  days: string[];
  hours: number[];
}

// ─────────────────────────────────────────
// 1. Owner analytics — date range
// ─────────────────────────────────────────
export async function getOwnerAnalytics(restaurantId: string, from: Date, to: Date) {
  const [bookings, reviews] = await Promise.all([
    prisma.booking.findMany({
      where: { restaurantId, date: { gte: from, lte: to }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      select: { date: true, bookingType: true, totalAmount: true, startTime: true, partySize: true, status: true },
    }),
    prisma.review.aggregate({
      where: { restaurantId },
      _avg: { rating: true, foodRating: true, serviceRating: true, ambienceRating: true },
      _count: { rating: true },
    }),
  ]);

  // Revenue by day
  const dailyMap = new Map<string, { revenue: number; bookings: number }>();
  let totalRevenue = 0;
  const byType: BookingsByType = { TABLE: 0, BUFFET: 0, EVENT_HALL: 0 };

  for (const b of bookings) {
    const day = b.date.toISOString().split("T")[0]!;
    const amt = Number(b.totalAmount);
    totalRevenue += amt;
    byType[b.bookingType as keyof BookingsByType]++;
    const prev = dailyMap.get(day) ?? { revenue: 0, bookings: 0 };
    dailyMap.set(day, { revenue: prev.revenue + amt, bookings: prev.bookings + 1 });
  }

  const daily: DailyRevenue[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Cancellation rate
  const totalAll = await prisma.booking.count({ where: { restaurantId, date: { gte: from, lte: to } } });
  const cancelled = await prisma.booking.count({ where: { restaurantId, date: { gte: from, lte: to }, status: "CANCELLED" } });
  const cancellationRate = totalAll > 0 ? Math.round((cancelled / totalAll) * 100 * 10) / 10 : 0;

  // Top booking days
  const topDays = daily.sort((a, b) => b.bookings - a.bookings).slice(0, 5);

  return {
    totalRevenue,
    totalBookings: bookings.length,
    cancellationRate,
    byType,
    daily,
    topDays,
    ratings: {
      average: reviews._avg.rating ? Math.round(Number(reviews._avg.rating) * 10) / 10 : null,
      food:     reviews._avg.foodRating ? Math.round(Number(reviews._avg.foodRating) * 10) / 10 : null,
      service:  reviews._avg.serviceRating ? Math.round(Number(reviews._avg.serviceRating) * 10) / 10 : null,
      ambience: reviews._avg.ambienceRating ? Math.round(Number(reviews._avg.ambienceRating) * 10) / 10 : null,
      count: reviews._count.rating,
    },
  };
}

// ─────────────────────────────────────────
// 2. Peak hours heatmap — 7×24 matrix
// ─────────────────────────────────────────
export async function getPeakHoursHeatmap(restaurantId: string, from: Date, to: Date): Promise<PeakHoursMatrix> {
  const bookings = await prisma.booking.findMany({
    where: { restaurantId, date: { gte: from, lte: to }, status: { in: ["CONFIRMED", "COMPLETED"] } },
    select: { date: true, startTime: true },
  });

  // 0=Mon … 6=Sun (ISO day: 1=Mon … 7=Sun)
  const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  for (const b of bookings) {
    const isoDay = b.date.getDay(); // 0=Sun … 6=Sat
    const row = isoDay === 0 ? 6 : isoDay - 1; // convert to Mon=0
    const hour = parseInt(b.startTime.split(":")[0] ?? "0", 10);
    if (row >= 0 && row < 7 && hour >= 0 && hour < 24) {
      matrix[row]![hour]++;
    }
  }

  return { matrix, days, hours: Array.from({ length: 24 }, (_, i) => i) };
}

// ─────────────────────────────────────────
// 3. Platform-wide analytics (Admin)
// ─────────────────────────────────────────
export async function getPlatformAnalytics() {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalUsers, totalRestaurants, totalBookings, totalRevenueSumResult,
    topByBookings, topByRevenue, monthlyBookings, monthlyUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.booking.count(),
    prisma.booking.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalAmount: true },
    }),

    // Top 10 restaurants by booking count
    prisma.booking.groupBy({
      by: ["restaurantId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),

    // Top 10 restaurants by revenue
    prisma.booking.groupBy({
      by: ["restaurantId"],
      where: { paymentStatus: "PAID" },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    }),

    // Monthly bookings (last 12 months via raw SQL)
    prisma.$queryRaw<Array<{ month: string; count: bigint; revenue: number }>>`
      SELECT
        TO_CHAR(date, 'YYYY-MM') AS month,
        COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAID' THEN "totalAmount" ELSE 0 END), 0) AS revenue
      FROM bookings
      WHERE date >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC;
    `,

    // Monthly user sign-ups
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT TO_CHAR("createdAt", 'YYYY-MM') AS month, COUNT(*) AS count
      FROM users
      WHERE "createdAt" >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month ASC;
    `,
  ]);

  // Hydrate top restaurants with names
  const allIds = [...new Set([...topByBookings.map(r => r.restaurantId), ...topByRevenue.map(r => r.restaurantId)])];
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: allIds } },
    select: { id: true, name: true, city: true, coverImage: true },
  });
  const restMap = new Map(restaurants.map(r => [r.id, r]));

  return {
    totals: {
      users: totalUsers,
      restaurants: totalRestaurants,
      bookings: totalBookings,
      revenue: Number(totalRevenueSumResult._sum.totalAmount ?? 0),
    },
    topRestaurantsByBookings: topByBookings.map(r => ({
      ...restMap.get(r.restaurantId),
      bookings: r._count.id,
    })),
    topRestaurantsByRevenue: topByRevenue.map(r => ({
      ...restMap.get(r.restaurantId),
      revenue: Number(r._sum.totalAmount ?? 0),
    })),
    monthlyBookings: monthlyBookings.map(m => ({
      month: m.month,
      count: Number(m.count),
      revenue: Number(m.revenue),
    })),
    userGrowth: monthlyUsers.map(m => ({ month: m.month, count: Number(m.count) })),
  };
}
