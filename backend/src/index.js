import './config/index.js'; // loads root .env before anything else
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { config } from './config/index.js';
import { logger } from './shared/logger.js';
import { ensureMinioReady } from './shared/minio.js';
import { redis } from './shared/redis.js';
import { prisma } from './shared/prisma.js';
import { authRoutes } from './auth/routes.js';
import { apiKeyRoutes } from './auth/api-keys.js';
import { storageRoutes } from './storage/routes.js';
import { meteringRoutes } from './metering/routes.js';
import { billingRoutes } from './billing/routes.js';
import { adminRoutes } from './admin/routes.js';
import { errorHandler } from './shared/errors.js';

const fastify = Fastify({
  logger: false,
  trustProxy: true,
});

fastify.setErrorHandler(errorHandler);

await fastify.register(cors, {
  origin: config.cors.origins,
  credentials: true,
});

await fastify.register(helmet, {
  contentSecurityPolicy: false,
});

await fastify.register(multipart, {
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

fastify.addHook('onRequest', async (req) => {
  logger.debug(`${req.method} ${req.url}`);
});

// Health check
fastify.get('/api/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
}));

// Register route modules
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(apiKeyRoutes, { prefix: '/api/keys' });
await fastify.register(storageRoutes, { prefix: '/api/storage' });
await fastify.register(meteringRoutes, { prefix: '/api' });
await fastify.register(billingRoutes, { prefix: '/api/billing' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });

async function start() {
  try {
    await redis.connect().catch(() => logger.warn('Redis not available, continuing without Redis'));
    await ensureMinioReady().catch(() => logger.warn('MinIO not available, continuing without MinIO'));

    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    logger.info(`Server running on http://0.0.0.0:${config.port}`);
  } catch (err) {
    logger.error('Failed to start server', { err: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await fastify.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err: err.message });
});

start();
