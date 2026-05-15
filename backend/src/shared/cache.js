import { redis } from './redis.js';

const DEFAULT_TTL = 300; // 5 minutes

export async function getCache(key) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    return null;
  } catch {
    return null;
  }
}

export async function setCache(key, value, ttl = DEFAULT_TTL) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // Cache failure is non-fatal
  }
}

export async function deleteCache(key) {
  try {
    await redis.del(key);
  } catch {
    // Ignore
  }
}

export async function invalidateTenantCache(tenantId) {
  try {
    const keys = await redis.keys(`tenant:${tenantId}:*`);
    if (keys.length > 0) await redis.del(keys);
  } catch {
    // Ignore
  }
}

export function tenantCacheKey(tenantId, resource) {
  return `tenant:${tenantId}:${resource}`;
}
