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
//
// `idle_timeout` matters more than it looks: without it postgres.js holds
// every connection it ever opens until the process exits. A production build
// instantiates this module once, so 10 is 10 — but `next dev` re-instantiates
// it on each hot reload, and the previous pool's connections stay open. A
// working session of ordinary edits walks the server up to `max_connections`,
// at which point every query fails with "remaining connection slots are
// reserved" and the UI reports the prediction service as unavailable — a
// confusing symptom for a cause that has nothing to do with the ML service.
const queryClient = postgres(databaseUrl, { max: 10, idle_timeout: 20 });

export const db = drizzle(queryClient, { schema });

// drizzle() above installs a pass-through timestamptz (OID 1184) parser, so
// the raw Postgres text reaches the app. In a UTC session (Neon, Vercel) that
// text ends "+00", which Pydantic rejects — every /predict became an ML 422.
// Completing the offset to "+00:00" is lossless: microseconds survive, so
// optimistic-concurrency comparisons on updated_at still match. Must run after
// drizzle(), which would otherwise overwrite it.
queryClient.options.parsers[1184] = (value: string) => value.replace(/([+-]\d{2})$/, "$1:00");
export * as dbSchema from "./schema";

// Keeps drizzle-orm an implementation detail of this package — callers
// (e.g. the health composition) never need their own drizzle-orm dependency
// just to check liveness.
export async function pingDatabase(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
