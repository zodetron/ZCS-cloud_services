import { prisma } from '../shared/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../rate-limit/index.js';
import { NotFoundError } from '../shared/errors.js';
import { getCache, setCache, tenantCacheKey } from '../shared/cache.js';

const GB = 1024 * 1024 * 1024;
const PRICING = {
  storage_gb: 0.023,
  download_gb: 0.09,
  requests_per_1k: 0.0004,
};

function calculateCost(storageBytes, downloadBytes, requestCount) {
  const storageGb = Number(storageBytes) / GB;
  const downloadGb = Number(downloadBytes) / GB;
  const storageFree = 5;
  const downloadFree = 1;
  const requestFree = 10000;

  const storageCost = Math.max(0, storageGb - storageFree) * PRICING.storage_gb;
  const downloadCost = Math.max(0, downloadGb - downloadFree) * PRICING.download_gb;
  const requestCost = Math.max(0, requestCount - requestFree) / 1000 * PRICING.requests_per_1k;

  return {
    storageCost: +storageCost.toFixed(4),
    downloadCost: +downloadCost.toFixed(4),
    requestCost: +requestCost.toFixed(4),
    total: +(storageCost + downloadCost + requestCost).toFixed(2),
  };
}

export async function billingRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', rateLimitMiddleware);

  fastify.get('/invoices', async (req) => {
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return { invoices };
  });

  fastify.get('/invoices/:id', async (req) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!invoice) throw new NotFoundError('Invoice');
    return { invoice };
  });

  fastify.get('/estimate', async (req) => {
    const cacheKey = tenantCacheKey(req.tenantId, 'billing:estimate');
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [uploadResult, downloadResult, requestCount, storageResult] = await Promise.all([
      prisma.usageEvent.aggregate({
        where: { tenantId: req.tenantId, eventType: 'upload', createdAt: { gte: startOfMonth } },
        _sum: { bytes: true },
      }),
      prisma.usageEvent.aggregate({
        where: { tenantId: req.tenantId, eventType: 'download', createdAt: { gte: startOfMonth } },
        _sum: { bytes: true },
      }),
      prisma.usageEvent.count({
        where: { tenantId: req.tenantId, createdAt: { gte: startOfMonth } },
      }),
      prisma.object.aggregate({
        where: { tenantId: req.tenantId },
        _sum: { size: true },
      }),
    ]);

    const storageBytes = storageResult._sum.size || BigInt(0);
    const downloadBytes = downloadResult._sum.bytes || BigInt(0);

    const costs = calculateCost(storageBytes, downloadBytes, requestCount);

    const result = {
      period: startOfMonth.toISOString().slice(0, 7),
      usage: {
        storageBytes: storageBytes.toString(),
        downloadBytes: downloadBytes.toString(),
        requestCount,
      },
      costs,
      pricing: PRICING,
    };

    await setCache(cacheKey, result, 120); // 2 min cache
    return result;
  });
}
