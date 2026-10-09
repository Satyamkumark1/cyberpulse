import { createHash } from "node:crypto";
import { createClient, type RedisClientType } from "redis";
import { env } from "./env";
import { logger } from "./logger";

// Redis is deliberately optional. Local development and a single web process
// continue to work with the in-memory fallbacks when REDIS_URL is absent or
// the free local container is stopped.
type RedisClient = RedisClientType;
let client: RedisClient | null = null;
let connection: Promise<RedisClient | null> | null = null;
let warned = false;

function warnOnce(error: unknown) {
  if (warned) return;
  warned = true;
  logger.warn({ err: error }, "Redis unavailable; using local fallbacks");
}

export async function getRedisClient(): Promise<RedisClient | null> {
  if (!env.REDIS_URL) return null;
  if (connection) return connection;

  client = createClient({ url: env.REDIS_URL, socket: { reconnectStrategy: false } });
  client.on("error", warnOnce);
  connection = client.connect()
    .then(() => client)
    .catch((error) => {
      warnOnce(error);
      client = null;
      connection = null;
      return null;
    });
  return connection;
}

function keyHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function redisKey(namespace: string, value: string): string {
  return `${namespace}:v1:${keyHash(value)}`;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) as T : null;
  } catch (error) {
    warnOnce(error);
    return null;
  }
}

export async function getCachedJsonWithTtl<T>(key: string): Promise<{ value: T; ttlSeconds: number } | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    const [value, ttlSeconds] = await redis.multi().get(key).ttl(key).exec();
    return typeof value === "string" ? { value: JSON.parse(value) as T, ttlSeconds: Number(ttlSeconds) } : null;
  } catch (error) {
    warnOnce(error);
    return null;
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    warnOnce(error);
  }
}

export async function consumeRateLimit(
  key: string,
  windowMs: number,
): Promise<{ count: number; resetAt: number } | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const bucketKey = `rate:v1:${windowSeconds}:${keyHash(key)}`;
  try {
    const [count, , ttlSeconds] = await redis.multi()
      .incr(bucketKey)
      .expire(bucketKey, windowSeconds, "NX")
      .ttl(bucketKey)
      .exec();
    const remainingSeconds = Number(ttlSeconds);
    return {
      count: Number(count),
      resetAt: Date.now() + (remainingSeconds > 0 ? remainingSeconds : windowSeconds) * 1000,
    };
  } catch (error) {
    warnOnce(error);
    return null;
  }
}
