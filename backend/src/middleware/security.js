import { createHash } from 'crypto';

export function addSecurityHeaders(fastify) {
  fastify.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  });
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function validateObjectKey(key) {
  if (!key || typeof key !== 'string') return false;
  if (key.length > 1024) return false;
  if (key.startsWith('/') || key.includes('..')) return false;
  return true;
}

export function validateBucketName(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(name);
}

export function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}
