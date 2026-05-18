import { prisma } from '../shared/prisma.js';
import { authenticate, authenticateApiKey } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../rate-limit/index.js';
import { getCache, setCache, tenantCacheKey } from '../shared/cache.js';

export async function meteringRoutes(fastify) {
  // ── Demo usage — isolated scope so only API-key auth applies ───────────────
  fastify.register(async (scope) => {
    scope.addHook('preHandler', authenticateApiKey);
    scope.addHook('preHandler', rateLimitMiddleware);

    scope.get('/demo/usage', async (req) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [uploadAgg, downloadAgg, requestCount, recentEvents, objectCount, totalStorage] = await Promise.all([
        prisma.usageEvent.aggregate({
          where: { tenantId: req.tenantId, eventType: 'upload', createdAt: { gte: startOfMonth } },
          _sum: { bytes: true },
        }),
        prisma.usageEvent.aggregate({
          where: { tenantId: req.tenantId, eventType: 'download', createdAt: { gte: startOfMonth } },
          _sum: { bytes: true },
        }),
        prisma.usageEvent.count({ where: { tenantId: req.tenantId, createdAt: { gte: startOfMonth } } }),
        prisma.usageEvent.findMany({
          where: { tenantId: req.tenantId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.object.count({ where: { tenantId: req.tenantId } }),
        prisma.object.aggregate({ where: { tenantId: req.tenantId }, _sum: { size: true } }),
      ]);

      const uploadBytes = Number(uploadAgg._sum.bytes || 0);
      const downloadBytes = Number(downloadAgg._sum.bytes || 0);
      const storageBytes = Number(totalStorage._sum.size || 0);

      const GB = 1024 ** 3;
      const storageCost = (storageBytes / GB) * 0.023;
      const egressCost = (downloadBytes / GB) * 0.09;
      const requestCost = (requestCount / 1000) * 0.0004;
      const totalCost = storageCost + egressCost + requestCost;

      return {
        period: startOfMonth.toISOString().slice(0, 7),
        storageBytes: storageBytes.toString(),
        uploadBytes: uploadBytes.toString(),
        downloadBytes: downloadBytes.toString(),
        requestCount,
        objectCount,
        costs: {
          storage: +storageCost.toFixed(6),
          egress: +egressCost.toFixed(6),
          requests: +requestCost.toFixed(6),
          total: +totalCost.toFixed(6),
        },
        recentEvents: recentEvents.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          bytes: e.bytes.toString(),
          createdAt: e.createdAt,
        })),
      };
    });
  });

  // ── JWT-protected routes — isolated scope ──────────────────────────────────
  fastify.register(async (scope) => {
    scope.addHook('preHandler', authenticate);
    scope.addHook('preHandler', rateLimitMiddleware);

    scope.get('/usage/summary', async (req) => {
      const cacheKey = tenantCacheKey(req.tenantId, 'usage:summary');
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [storageResult, uploadResult, downloadResult, requestCount, objectCount, totalStorageBytes] =
        await Promise.all([
          prisma.usageEvent.aggregate({
            where: { tenantId: req.tenantId, eventType: 'storage_put', createdAt: { gte: startOfMonth } },
            _sum: { bytes: true },
          }),
          prisma.usageEvent.aggregate({
            where: { tenantId: req.tenantId, eventType: 'upload', createdAt: { gte: startOfMonth } },
            _sum: { bytes: true },
          }),
          prisma.usageEvent.aggregate({
            where: { tenantId: req.tenantId, eventType: 'download', createdAt: { gte: startOfMonth } },
            _sum: { bytes: true },
          }),
          prisma.usageEvent.count({ where: { tenantId: req.tenantId, createdAt: { gte: startOfMonth } } }),
          prisma.object.count({ where: { tenantId: req.tenantId } }),
          prisma.object.aggregate({ where: { tenantId: req.tenantId }, _sum: { size: true } }),
        ]);

      const result = {
        period: startOfMonth.toISOString().slice(0, 7),
        storageBytes: totalStorageBytes._sum.size?.toString() || '0',
        uploadBytes: uploadResult._sum.bytes?.toString() || '0',
        downloadBytes: downloadResult._sum.bytes?.toString() || '0',
        requestCount,
        objectCount,
      };

      await setCache(cacheKey, result, 60); // 60s cache
      return result;
    });

    scope.get('/usage/history', async (req) => {
      const { months = 6 } = req.query;
      const cacheKey = tenantCacheKey(req.tenantId, `usage:history:${months}`);
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const aggregates = await prisma.usageAggregate.findMany({
        where: { tenantId: req.tenantId },
        orderBy: { period: 'desc' },
        take: parseInt(months),
      });

      const result = {
        history: aggregates.map((a) => ({
          ...a,
          storageBytes: a.storageBytes.toString(),
          uploadBytes: a.uploadBytes.toString(),
          downloadBytes: a.downloadBytes.toString(),
          requestCount: a.requestCount.toString(),
          objectCount: a.objectCount.toString(),
        })),
      };

      await setCache(cacheKey, result, 300); // 5 min cache
      return result;
    });

    scope.get('/usage/events', async (req) => {
      const { limit = 20, offset = 0 } = req.query;
      const events = await prisma.usageEvent.findMany({
        where: { tenantId: req.tenantId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit), 100),
        skip: parseInt(offset),
      });

      return {
        events: events.map((e) => ({ ...e, bytes: e.bytes.toString() })),
      };
    });

    scope.post('/usage/event', async (req, reply) => {
      const { eventType, bytes, objectKey, bucketName, metadata } = req.body;

      await prisma.usageEvent.create({
        data: {
          tenantId: req.tenantId,
          apiKeyId: req.apiKeyId || null,
          eventType,
          bytes: BigInt(bytes || 0),
          objectKey,
          bucketName,
          metadata,
        },
      });

      return reply.status(201).send({ ok: true });
    });
  });
}
