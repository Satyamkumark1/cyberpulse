import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set");
}

// One pooled connection per process. Neon and local Postgres both accept
// this client (ADR-003) — pooling is mandatory against Neon's free-tier
// connection limits.
const queryClient = postgres(databaseUrl, { max: 10 });

export const db = drizzle(queryClient, { schema });
export * as dbSchema from "./schema";

// Keeps drizzle-orm an implementation detail of this package — callers
// (e.g. the health composition) never need their own drizzle-orm dependency
// just to check liveness.
export async function pingDatabase(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
