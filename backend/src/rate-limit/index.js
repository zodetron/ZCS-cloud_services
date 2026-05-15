import { redis } from '../shared/redis.js';
import { RateLimitError } from '../shared/errors.js';

const DEFAULT_WINDOW = 60; // seconds
const DEFAULT_MAX = 1000;  // requests per window

export async function checkRateLimit(tenantId, keyId, max = DEFAULT_MAX, window = DEFAULT_WINDOW) {
  const key = keyId ? `rl:key:${keyId}` : `rl:tenant:${tenantId}`;

  try {
    const [count] = await redis.multi()
      .incr(key)
      .expire(key, window)
      .exec();

    const current = count[1];

    if (current > max) {
      const ttl = await redis.ttl(key);
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
    const result = await checkRateLimit(req.tenantId, req.apiKeyId);
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
