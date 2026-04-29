import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  max: Number(process.env["DATABASE_MAX_CONNECTIONS"] ?? 20),
  idleTimeoutMillis: Number(process.env["DATABASE_IDLE_TIMEOUT_MS"] ?? 30_000),
  ssl: process.env["DATABASE_SSL"] === "true" ? { rejectUnauthorized: false } : false,
});

// Graceful shutdown
process.on("SIGTERM", () => pool.end());
process.on("SIGINT", () => pool.end());

export const db = drizzle(pool);
export { pool };
