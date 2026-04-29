import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT, requireRole } from "../middleware/auth";
import {
  cacheGet, cacheSet, cacheNearby, cacheRestaurant, cacheAvailability,
  invalidateRestaurantCache, CacheKey, TTL,
} from "../services/cache";
import { getAvailability } from "../services/availability";
import { emitAvailabilityUpdate } from "../services/realtime";
import type { JWTPayload } from "../middleware/auth";

// ─── Zod schemas ──────────────────────────
const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(50).default(10),
  cuisine: z.string().optional(),
  priceRange: z.enum(["BUDGET","MODERATE","EXPENSIVE","LUXURY"]).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
});

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
});

const availSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  type: z.enum(["TABLE", "BUFFET", "EVENT_HALL"]).default("TABLE"),
  partySize: z.coerce.number().int().min(1).max(500).default(2),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const createSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(2000),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  cuisineType: z.enum(["INDIAN","CHINESE","ITALIAN","JAPANESE","MEXICAN","THAI","CONTINENTAL","MIDDLE_EASTERN","MEDITERRANEAN","AMERICAN","MULTI_CUISINE","OTHER"]),
  priceRange: z.enum(["BUDGET","MODERATE","EXPENSIVE","LUXURY"]),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  coverImage: z.string().url().optional(),
  images: z.array(z.string().url()).default([]),
});

const updateSchema = createSchema.partial();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Plugin ───────────────────────────────
export async function restaurantRoutes(fastify: FastifyInstance) {
  // ──────────────────────────────────────
  // GET /restaurants/nearby  (PostGIS)
  // ──────────────────────────────────────
  fastify.get("/nearby", async (request, reply) => {
    const q = nearbySchema.parse(request.query);
    const radiusMetres = q.radius * 1000;
    const filterKey = `${q.cuisine ?? ""}_${q.priceRange ?? ""}_${q.rating ?? ""}`;
    const cacheKey = CacheKey.nearby(q.lat, q.lng, q.radius, filterKey);

    // Cache hit
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send({ success: true, cached: true, ...cached as object });

    // PostGIS query — ST_DWithin on geography column
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        r.id,
        r.name,
        r.slug,
        r.city,
        r.state,
        r."cuisineType",
        r."priceRange",
        r.rating,
        r."totalReviews",
        r."coverImage",
        r.address,
        r.latitude,
        r.longitude,
        r.phone,
        r."isVerified",
        ROUND(
          (ST_Distance(
            r.location::geography,
            ST_MakePoint(${q.lng}, ${q.lat})::geography
          ) / 1000.0)::numeric, 2
        ) AS distance_km
      FROM restaurants r
      WHERE r."isActive" = true
        AND r."isVerified" = true
        AND ST_DWithin(
          r.location::geography,
          ST_MakePoint(${q.lng}, ${q.lat})::geography,
          ${radiusMetres}
        )
        ${q.cuisine ? prisma.$queryRaw`AND r."cuisineType" = ${q.cuisine}` : prisma.$queryRaw``}
        ${q.priceRange ? prisma.$queryRaw`AND r."priceRange" = ${q.priceRange}` : prisma.$queryRaw``}
        ${q.rating ? prisma.$queryRaw`AND r.rating >= ${q.rating}` : prisma.$queryRaw``}
      ORDER BY distance_km ASC
      LIMIT ${q.limit}
      OFFSET ${(q.page - 1) * q.limit};
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM restaurants r
      WHERE r."isActive" = true AND r."isVerified" = true
        AND ST_DWithin(
          r.location::geography,
          ST_MakePoint(${q.lng}, ${q.lat})::geography,
          ${radiusMetres}
        );
    `;
    const total = Number(countResult[0]?.count ?? 0);

    const result = {
      data: rows,
      meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit), hasNextPage: (q.page * q.limit) < total, hasPrevPage: q.page > 1 },
    };

    await cacheNearby(q.lat, q.lng, q.radius, filterKey, result);
    return reply.send({ success: true, cached: false, ...result });
  });

  // ──────────────────────────────────────
  // GET /restaurants/search
  // ──────────────────────────────────────
  fastify.get("/search", async (request, reply) => {
    const { q, page, limit } = searchSchema.parse(request.query);
    const cacheKey = CacheKey.search(q, page);
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send({ success: true, cached: true, ...(cached as object) });

    const skip = (page - 1) * limit;
    const where = {
      isActive: true,
      isVerified: true,
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { city: { contains: q, mode: "insensitive" as const } },
        { address: { contains: q, mode: "insensitive" as const } },
      ],
    };

    const [total, restaurants] = await Promise.all([
      prisma.restaurant.count({ where }),
      prisma.restaurant.findMany({
        where, skip, take: limit,
        orderBy: { rating: "desc" },
        select: {
          id: true, name: true, slug: true, city: true, state: true,
          cuisineType: true, priceRange: true, rating: true, totalReviews: true,
          coverImage: true, address: true, isVerified: true, phone: true,
          _count: { select: { tables: true, buffetSessions: true, eventHalls: true } },
        },
      }),
    ]);

    const result = { data: restaurants, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: skip + limit < total, hasPrevPage: page > 1 } };
    await cacheSet(cacheKey, result, TTL.SEARCH);
    return reply.send({ success: true, cached: false, ...result });
  });

  // ──────────────────────────────────────
  // GET /restaurants/:id — full detail
  // ──────────────────────────────────────
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const cacheKey = CacheKey.restaurant(id);
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send({ success: true, cached: true, data: cached });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        operatingHours: { orderBy: { dayOfWeek: "asc" } },
        tables: { where: { isActive: true }, orderBy: [{ section: "asc" }, { tableNumber: "asc" }] },
        buffetSessions: { where: { isActive: true } },
        eventHalls: { where: { isActive: true } },
        reviews: {
          take: 5, orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        _count: { select: { reviews: true, tables: true, bookings: true } },
      },
    });

    if (!restaurant) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Restaurant not found" } });
    }

    await cacheRestaurant(restaurant.id, restaurant.slug, restaurant);
    return reply.send({ success: true, cached: false, data: restaurant });
  });

  // ──────────────────────────────────────
  // GET /restaurants/:id/availability
  // ──────────────────────────────────────
  fastify.get("/:id/availability", async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = availSchema.parse(request.query);
    const cacheKey = CacheKey.availability(id, q.date, q.type);
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send({ success: true, cached: true, data: cached });

    const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { id: true } });
    if (!restaurant) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Restaurant not found" } });
    }

    const availability = await getAvailability(id, q.type, q.date, q.partySize, q.endDate);
    await cacheAvailability(id, q.date, q.type, availability);

    // Broadcast to Socket.IO room so live browsers update
    emitAvailabilityUpdate(id, q.date, q.type, availability as any);

    return reply.send({ success: true, cached: false, data: availability });
  });

  // ──────────────────────────────────────
  // POST /restaurants  [RESTAURANT_OWNER]
  // ──────────────────────────────────────
  fastify.post("/", { onRequest: [verifyJWT, requireRole("RESTAURANT_OWNER", "ADMIN")] }, async (request, reply) => {
    const user = request.user as JWTPayload;
    const body = createSchema.parse(request.body);
    const baseSlug = slugify(body.name);

    // Ensure unique slug
    let slug = `${baseSlug}-${body.city.toLowerCase()}`;
    const exists = await prisma.restaurant.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const restaurant = await prisma.restaurant.create({
      data: {
        ...body,
        slug,
        ownerId: user.sub,
      },
    });

    // Update PostGIS geography column
    await prisma.$executeRaw`
      UPDATE restaurants
      SET location = ST_MakePoint(${body.longitude}, ${body.latitude})::geography
      WHERE id = ${restaurant.id}::uuid;
    `;

    return reply.status(201).send({ success: true, data: restaurant });
  });

  // ──────────────────────────────────────
  // PUT /restaurants/:id  [RESTAURANT_OWNER]
  // ──────────────────────────────────────
  fastify.put("/:id", { onRequest: [verifyJWT, requireRole("RESTAURANT_OWNER", "ADMIN")] }, async (request, reply) => {
    const user = request.user as JWTPayload;
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);

    const existing = await prisma.restaurant.findUnique({ where: { id }, select: { ownerId: true, slug: true } });
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Restaurant not found" } });
    }
    if (existing.ownerId !== user.sub && user.role !== "ADMIN") {
      return reply.status(403).send({ success: false, error: { code: "FORBIDDEN", message: "You do not own this restaurant" } });
    }

    const updated = await prisma.restaurant.update({ where: { id }, data: body });

    // Update PostGIS column if lat/lng changed
    if (body.latitude != null && body.longitude != null) {
      await prisma.$executeRaw`
        UPDATE restaurants
        SET location = ST_MakePoint(${body.longitude}, ${body.latitude})::geography
        WHERE id = ${id}::uuid;
      `;
    }

    await invalidateRestaurantCache(id, existing.slug);
    return reply.send({ success: true, data: updated });
  });
}
