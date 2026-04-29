import type { Redis } from "ioredis";

// ─────────────────────────────────────────
// Redis client (imported from server bootstrap)
// ─────────────────────────────────────────
let redisClient: Redis | null = null;

export function setRedisClient(client: Redis) {
  redisClient = client;
}

function getClient(): Redis {
  if (!redisClient) throw new Error("Redis client not initialized");
  return redisClient;
}

// ─────────────────────────────────────────
// TTLs (seconds)
// ─────────────────────────────────────────
const TTL = {
  NEARBY:       5 * 60,   // 5 min — nearby search
  RESTAURANT:  10 * 60,   // 10 min — single restaurant detail
  AVAILABILITY:     60,   // 1 min  — availability changes frequently
  SEARCH:       3 * 60,   // 3 min  — full-text search results
} as const;

// ─────────────────────────────────────────
// Key builders
// ─────────────────────────────────────────
export const CacheKey = {
  nearby: (lat: number, lng: number, radius: number, filters: string) =>
    `nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}:${filters}`,

  restaurant: (id: string) => `restaurant:${id}`,

  restaurantSlug: (slug: string) => `restaurant:slug:${slug}`,

  availability: (restaurantId: string, date: string, type: string) =>
    `avail:${restaurantId}:${date}:${type}`,

  search: (q: string, page: number) =>
    `search:${q.toLowerCase().trim()}:${page}`,
};

// ─────────────────────────────────────────
// Generic get / set / del
// ─────────────────────────────────────────
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getClient().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null; // cache miss on parse error
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getClient().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // non-fatal — app continues without cache
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await getClient().del(...keys);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────
// Domain helpers
// ─────────────────────────────────────────
export async function cacheNearby<T>(
  lat: number, lng: number, radius: number, filters: string, data: T
) {
  await cacheSet(CacheKey.nearby(lat, lng, radius, filters), data, TTL.NEARBY);
}

export async function cacheRestaurant<T>(id: string, slug: string, data: T) {
  await Promise.all([
    cacheSet(CacheKey.restaurant(id), data, TTL.RESTAURANT),
    cacheSet(CacheKey.restaurantSlug(slug), data, TTL.RESTAURANT),
  ]);
}

export async function cacheAvailability<T>(
  restaurantId: string, date: string, type: string, data: T
) {
  await cacheSet(CacheKey.availability(restaurantId, date, type), data, TTL.AVAILABILITY);
}

// ─────────────────────────────────────────
// Cache invalidation
// ─────────────────────────────────────────
export async function invalidateRestaurantCache(restaurantId: string, slug?: string) {
  const client = getClient();
  const keys: string[] = [CacheKey.restaurant(restaurantId)];
  if (slug) keys.push(CacheKey.restaurantSlug(slug));

  // Scan and delete all availability + nearby keys containing this restaurantId
  const pattern = `avail:${restaurantId}:*`;
  const availKeys = await scanKeys(client, pattern);

  await cacheDel(...keys, ...availKeys);
}

async function scanKeys(client: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [nextCursor, batch] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

// Export TTL constants for use elsewhere
export { TTL };
