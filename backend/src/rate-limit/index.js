import { redis } from '../shared/redis.js';
import { prisma } from '../shared/prisma.js';
import { RateLimitError } from '../shared/errors.js';

const CONFIG_CACHE_TTL = 300; // cache tenant config for 5 min

async function getTenantLimits(tenantId) {
  const cacheKey = `rl:config:${tenantId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { rateLimitMax: true, rateLimitWindow: true },
  });

  const limits = {
    max: tenant?.rateLimitMax ?? 1000,
    window: tenant?.rateLimitWindow ?? 60,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(limits), 'EX', CONFIG_CACHE_TTL);
  } catch {}

  return limits;
}

export async function invalidateTenantLimitCache(tenantId) {
  try {
    await redis.del(`rl:config:${tenantId}`);
  } catch {}
}

export async function checkRateLimit(tenantId, keyId, max, window) {
  const key = keyId ? `rl:key:${keyId}` : `rl:tenant:${tenantId}`;

  try {
    const [count] = await redis.multi()
      .incr(key)
      .expire(key, window)
      .exec();

    const current = count[1];

    if (current > max) {
      throw new RateLimitError();
    }

    return {
      limit: max,
      remaining: Math.max(0, max - current),
      reset: Math.floor(Date.now() / 1000) + window,
    };
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    return { limit: max, remaining: max, reset: 0 };
  }
}

export function rateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };
}

export async function rateLimitMiddleware(req, reply) {
  if (!req.tenantId) return;

  try {
    const { max, window } = await getTenantLimits(req.tenantId);
    const result = await checkRateLimit(req.tenantId, req.apiKeyId, max, window);
    const headers = rateLimitHeaders(result);
    Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
  } catch (err) {
    if (err instanceof RateLimitError) {
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down.',
      });
    }
  }
}
