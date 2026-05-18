import os from 'os';
import { prisma } from '../shared/prisma.js';
import { redis } from '../shared/redis.js';
import { minioClient } from '../shared/minio.js';
import { config } from '../config/index.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';
import { invalidateTenantLimitCache } from '../rate-limit/index.js';

function audit(req, action, resource, tenantId = null, details = null) {
  return prisma.auditLog.create({
    data: {
      action,
      resource,
      tenantId,
      details: details ?? undefined,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    },
  }).catch(() => {});
}

export async function adminRoutes(fastify) {
  fastify.addHook('preHandler', authenticateAdmin);

  fastify.get('/tenants', async (req) => {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          _count: { select: { buckets: true, apiKeys: true, usageEvents: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.tenant.count({ where }),
    ]);

    return {
      tenants: tenants.map((t) => ({
        ...t,
        passwordHash: undefined,
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    };
  });

  fastify.patch('/tenants/:id/status', async (req, reply) => {
    const { id } = req.params;
    const { status } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundError('Tenant');

    await prisma.tenant.update({ where: { id }, data: { status } });
    const action = status === 'active' ? 'TENANT_ACTIVATED' : 'TENANT_SUSPENDED';
    audit(req, action, `tenant:${id}`, id, { previousStatus: tenant.status, newStatus: status });
    return reply.send({ message: `Tenant ${status}` });
  });

  fastify.patch('/tenants/:id/plan', async (req, reply) => {
    const { id } = req.params;
    const { plan } = req.body;

    const validPlans = ['free', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      throw new ValidationError(`Plan must be one of: ${validPlans.join(', ')}`);
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundError('Tenant');

    const updated = await prisma.tenant.update({
      where: { id },
      data: { plan },
      select: { id: true, plan: true },
    });
    audit(req, 'PLAN_CHANGED', `tenant:${id}`, id, { previousPlan: tenant.plan, newPlan: plan });
    return reply.send({ tenant: updated });
  });

  fastify.get('/stats', async () => {
    const [tenantCount, bucketCount, objectCount, storageResult] = await Promise.all([
      prisma.tenant.count(),
      prisma.bucket.count(),
      prisma.object.count(),
      prisma.object.aggregate({ _sum: { size: true } }),
    ]);

    return {
      tenants: tenantCount,
      buckets: bucketCount,
      objects: objectCount,
      totalStorageBytes: storageResult._sum.size?.toString() || '0',
    };
  });

  fastify.get('/infrastructure', async () => {
    // ── System metrics ─────────────────────────────────────────────
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const cpuPercent = Math.min(100, (loadAvg / cpuCount) * 100);
    const mem = process.memoryUsage();

    // ── Service health checks ──────────────────────────────────────
    async function check(name, fn) {
      const t = Date.now();
      try {
        await fn();
        return { name, status: 'healthy', latencyMs: Date.now() - t };
      } catch (err) {
        return { name, status: 'unhealthy', latencyMs: Date.now() - t, error: err.message };
      }
    }

    const [pgCheck, redisCheck, storageCheck] = await Promise.all([
      check('PostgreSQL', () => prisma.$queryRaw`SELECT 1`),
      check('Redis', () => redis.ping()),
      check('Object Storage', () => minioClient.bucketExists(config.minio.bucket)),
    ]);

    const apiCheck = { name: 'API Server', status: 'healthy', latencyMs: 0 };

    // ── Real storage from DB ───────────────────────────────────────
    const [objectCount, bucketCount, storageResult, tenantCount] = await Promise.all([
      prisma.object.count(),
      prisma.bucket.count(),
      prisma.object.aggregate({ _sum: { size: true } }),
      prisma.tenant.count(),
    ]);

    return {
      system: {
        cpuPercent: +cpuPercent.toFixed(1),
        cpuCores: cpuCount,
        loadAvg1m: +loadAvg.toFixed(2),
        memoryUsedBytes: usedMem,
        memoryTotalBytes: totalMem,
        memoryPercent: +((usedMem / totalMem) * 100).toFixed(1),
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        processUptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: os.platform(),
      },
      storage: {
        totalObjectBytes: storageResult._sum.size?.toString() || '0',
        objectCount,
        bucketCount,
        tenantCount,
      },
      services: [apiCheck, pgCheck, redisCheck, storageCheck],
      timestamp: new Date().toISOString(),
    };
  });

  // ── Rate limit management ──────────────────────────────────────────────────

  fastify.get('/rate-limits/defaults', async () => {
    let defaults = { max: 1000, window: 60 };
    try {
      const stored = await redis.get('platform:rl:defaults');
      if (stored) defaults = JSON.parse(stored);
    } catch {}
    return { defaults };
  });

  fastify.put('/rate-limits/defaults', async (req) => {
    const { max, window: win, applyTo } = req.body;

    if (!max || max < 1 || max > 1000000) throw new ValidationError('max must be between 1 and 1,000,000');
    if (!win || win < 1 || win > 86400)   throw new ValidationError('window must be between 1 and 86400 seconds');

    try { await redis.set('platform:rl:defaults', JSON.stringify({ max, window: win })); } catch {}

    const validPlans = ['free', 'pro', 'enterprise'];
    const where = applyTo === 'all' ? {} : validPlans.includes(applyTo) ? { plan: applyTo } : null;

    if (where !== null) {
      await prisma.tenant.updateMany({ where, data: { rateLimitMax: max, rateLimitWindow: win } });
      const affected = await prisma.tenant.findMany({ where, select: { id: true } });
      await Promise.all(affected.map((t) => invalidateTenantLimitCache(t.id)));
      audit(req, 'RATE_LIMIT_UPDATED', `global:${applyTo}`, null, { max, window: win, applied: affected.length });
      return { ok: true, applied: affected.length };
    }

    return { ok: true, applied: 0 };
  });

  fastify.get('/rate-limits', async () => {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true, name: true, email: true, plan: true, status: true,
        rateLimitMax: true, rateLimitWindow: true,
      },
      orderBy: { name: 'asc' },
    });

    // Fetch live Redis usage for each tenant in parallel
    const withUsage = await Promise.all(
      tenants.map(async (t) => {
        let current = 0;
        let ttl = 0;
        try {
          const val = await redis.get(`rl:tenant:${t.id}`);
          current = val ? parseInt(val) : 0;
          ttl = await redis.ttl(`rl:tenant:${t.id}`);
        } catch {}
        return { ...t, currentUsage: current, windowResetIn: ttl > 0 ? ttl : 0 };
      })
    );

    return { tenants: withUsage };
  });

  fastify.patch('/rate-limits/:tenantId', async (req, reply) => {
    const { tenantId } = req.params;
    const { rateLimitMax, rateLimitWindow } = req.body;

    if (rateLimitMax !== undefined && (rateLimitMax < 1 || rateLimitMax > 1000000)) {
      throw new ValidationError('rateLimitMax must be between 1 and 1,000,000');
    }
    if (rateLimitWindow !== undefined && (rateLimitWindow < 1 || rateLimitWindow > 86400)) {
      throw new ValidationError('rateLimitWindow must be between 1 and 86400 seconds');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant');

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(rateLimitMax !== undefined && { rateLimitMax }),
        ...(rateLimitWindow !== undefined && { rateLimitWindow }),
      },
      select: { id: true, name: true, rateLimitMax: true, rateLimitWindow: true },
    });

    await invalidateTenantLimitCache(tenantId);
    audit(req, 'RATE_LIMIT_UPDATED', `tenant:${tenantId}`, tenantId, { rateLimitMax, rateLimitWindow });
    return { tenant: updated };
  });

  fastify.post('/rate-limits/:tenantId/reset', async (req, reply) => {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant');

    try {
      await redis.del(`rl:tenant:${tenantId}`);
    } catch {}

    return reply.status(200).send({ ok: true, message: 'Rate limit counter reset' });
  });

  fastify.post('/rate-limits/bulk', async (req, reply) => {
    const { plan, rateLimitMax, rateLimitWindow } = req.body;
    if (!plan) throw new ValidationError('plan is required');

    await prisma.tenant.updateMany({
      where: { plan },
      data: {
        ...(rateLimitMax !== undefined && { rateLimitMax }),
        ...(rateLimitWindow !== undefined && { rateLimitWindow }),
      },
    });

    const tenants = await prisma.tenant.findMany({ where: { plan }, select: { id: true } });
    await Promise.all(tenants.map((t) => invalidateTenantLimitCache(t.id)));

    return { updated: tenants.length };
  });

  // ── Pricing management ────────────────────────────────────────────────────

  const DEFAULT_PRICING = [
    { name: 'Storage',  metric: 'storage_gb',     unitPrice: 50,  unit: 'GB',          freeQuota: BigInt(5)  },
    { name: 'Egress',   metric: 'download_gb',    unitPrice: 20,  unit: 'GB',          freeQuota: BigInt(1)  },
    { name: 'Requests', metric: 'requests_per_1k',unitPrice: 500, unit: '1k requests', freeQuota: BigInt(10) },
  ];

  async function getOrSeedRules() {
    let rules = await prisma.pricingRule.findMany({ orderBy: { createdAt: 'asc' } });
    if (rules.length === 0) {
      await prisma.pricingRule.createMany({ data: DEFAULT_PRICING });
      rules = await prisma.pricingRule.findMany({ orderBy: { createdAt: 'asc' } });
    }
    return rules.map((r) => ({ ...r, freeQuota: r.freeQuota.toString() }));
  }

  fastify.get('/pricing', async () => {
    const [rules, overrideCount] = await Promise.all([
      getOrSeedRules(),
      prisma.tenant.count({ where: { NOT: { pricingOverride: null } } }),
    ]);
    return { rules, overrideCount };
  });

  fastify.put('/pricing/global', async (req) => {
    const { rules } = req.body;
    if (!Array.isArray(rules)) throw new ValidationError('rules must be an array');

    await Promise.all(rules.map(async ({ metric, unitPrice, freeQuota }) => {
      if (+unitPrice < 0) throw new ValidationError('unitPrice cannot be negative');
      const existing = await prisma.pricingRule.findFirst({ where: { metric } });
      if (existing) {
        await prisma.pricingRule.update({
          where: { id: existing.id },
          data: { unitPrice: +unitPrice, freeQuota: BigInt(Math.round(+freeQuota || 0)) },
        });
      }
    }));

    audit(req, 'PRICING_UPDATED', 'pricing:global', null, { rulesUpdated: rules.length });
    return { ok: true };
  });

  fastify.get('/pricing/overrides', async (req) => {
    const { search } = req.query;
    const tenants = await prisma.tenant.findMany({
      where: {
        NOT: { pricingOverride: null },
        ...(search ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]} : {}),
      },
      select: { id: true, name: true, email: true, plan: true, pricingOverride: true },
      orderBy: { name: 'asc' },
    });
    return { tenants };
  });

  fastify.patch('/pricing/tenant/:id', async (req) => {
    const { id } = req.params;
    const { pricingOverride } = req.body;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundError('Tenant');
    await prisma.tenant.update({ where: { id }, data: { pricingOverride: pricingOverride ?? null } });
    audit(req, 'PRICING_OVERRIDE_SET', `tenant:${id}`, id);
    return { ok: true };
  });

  fastify.delete('/pricing/tenant/:id', async (req, reply) => {
    const { id } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundError('Tenant');
    await prisma.tenant.update({ where: { id }, data: { pricingOverride: null } });
    audit(req, 'PRICING_OVERRIDE_REMOVED', `tenant:${id}`, id);
    return reply.status(204).send();
  });

  // ── Audit logs ────────────────────────────────────────────────────────────

  fastify.get('/audit-logs', async (req) => {
    const { limit = 50, tenantId } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });
    return { logs };
  });

  // ── Abuse detection ───────────────────────────────────────────────────────

  fastify.get('/abuse/signals', async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // All tenants with their rate limit config
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, email: true, plan: true, status: true, rateLimitMax: true, rateLimitWindow: true },
    });

    // UsageEvent aggregates per tenant in last 24h
    const [uploadAggs, downloadAggs, requestCounts] = await Promise.all([
      prisma.usageEvent.groupBy({
        by: ['tenantId'],
        where: { eventType: 'upload', createdAt: { gte: since24h } },
        _sum: { bytes: true },
      }),
      prisma.usageEvent.groupBy({
        by: ['tenantId'],
        where: { eventType: 'download', createdAt: { gte: since24h } },
        _sum: { bytes: true },
      }),
      prisma.usageEvent.groupBy({
        by: ['tenantId'],
        where: { createdAt: { gte: since24h } },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps
    const uploadMap = Object.fromEntries(uploadAggs.map((r) => [r.tenantId, Number(r._sum.bytes || 0)]));
    const downloadMap = Object.fromEntries(downloadAggs.map((r) => [r.tenantId, Number(r._sum.bytes || 0)]));
    const requestMap = Object.fromEntries(requestCounts.map((r) => [r.tenantId, r._count.id]));

    // Thresholds for spikes (24h)
    const GB = 1024 ** 3;
    const UPLOAD_SPIKE_BYTES = 10 * GB;   // >10 GB upload in 24h
    const EGRESS_SPIKE_BYTES = 50 * GB;   // >50 GB download in 24h
    const REQUEST_SPIKE = 100_000;         // >100k requests in 24h

    // Fetch ignored set and live Redis counters in parallel
    let ignoredSet = new Set();
    const counterResults = await Promise.allSettled([
      redis.smembers('abuse:ignored').then((m) => { ignoredSet = new Set(m); }),
      ...tenants.map((t) =>
        redis.get(`rl:tenant:${t.id}`).then((v) => ({ id: t.id, count: v ? parseInt(v) : 0 }))
      ),
    ]);

    // Extract Redis counter values (skip first result which was smembers)
    const counterMap = {};
    for (let i = 1; i < counterResults.length; i++) {
      const r = counterResults[i];
      if (r.status === 'fulfilled' && r.value) {
        counterMap[r.value.id] = r.value.count;
      }
    }

    const flagged = [];

    for (const t of tenants) {
      if (ignoredSet.has(t.id)) continue;

      const rlMax = t.rateLimitMax ?? 1000;
      const currentCount = counterMap[t.id] ?? 0;
      const rlPercent = rlMax > 0 ? (currentCount / rlMax) * 100 : 0;

      const uploadBytes = uploadMap[t.id] ?? 0;
      const downloadBytes = downloadMap[t.id] ?? 0;
      const reqCount = requestMap[t.id] ?? 0;

      const signals = [];

      if (rlPercent >= 95) {
        signals.push({
          type: 'rate_limit_critical',
          label: 'Rate Limit Critical',
          detail: `${currentCount}/${rlMax} requests (${rlPercent.toFixed(0)}% of limit)`,
          severity: 'high',
        });
      } else if (rlPercent >= 75) {
        signals.push({
          type: 'rate_limit_high',
          label: 'Rate Limit High',
          detail: `${currentCount}/${rlMax} requests (${rlPercent.toFixed(0)}% of limit)`,
          severity: 'medium',
        });
      }

      if (uploadBytes > UPLOAD_SPIKE_BYTES) {
        signals.push({
          type: 'upload_spike',
          label: 'Upload Spike',
          detail: `${(uploadBytes / GB).toFixed(1)} GB uploaded in last 24h`,
          severity: uploadBytes > UPLOAD_SPIKE_BYTES * 5 ? 'high' : 'medium',
        });
      }

      if (downloadBytes > EGRESS_SPIKE_BYTES) {
        signals.push({
          type: 'egress_spike',
          label: 'Egress Spike',
          detail: `${(downloadBytes / GB).toFixed(1)} GB downloaded in last 24h`,
          severity: downloadBytes > EGRESS_SPIKE_BYTES * 3 ? 'high' : 'medium',
        });
      }

      if (reqCount > REQUEST_SPIKE) {
        signals.push({
          type: 'request_spike',
          label: 'Request Spike',
          detail: `${reqCount.toLocaleString()} API calls in last 24h`,
          severity: reqCount > REQUEST_SPIKE * 5 ? 'high' : 'medium',
        });
      }

      if (signals.length === 0) continue;

      const overallSeverity = signals.some((s) => s.severity === 'high') ? 'high' : 'medium';

      flagged.push({
        tenantId: t.id,
        tenantName: t.name,
        tenantEmail: t.email,
        plan: t.plan,
        status: t.status,
        severity: overallSeverity,
        signals,
        stats: {
          rlPercent: +rlPercent.toFixed(1),
          rlCurrent: currentCount,
          rlMax,
          uploadBytes24h: uploadBytes.toString(),
          downloadBytes24h: downloadBytes.toString(),
          requestCount24h: reqCount,
        },
      });
    }

    // Ignored tenants list
    const ignoredTenants = await prisma.tenant.findMany({
      where: { id: { in: [...ignoredSet] } },
      select: { id: true, name: true, email: true, plan: true, status: true },
    });

    flagged.sort((a, b) => (a.severity === 'high' ? -1 : 1));

    return {
      flagged,
      ignored: ignoredTenants,
      counts: {
        high: flagged.filter((f) => f.severity === 'high').length,
        medium: flagged.filter((f) => f.severity === 'medium').length,
        ignored: ignoredSet.size,
      },
      generatedAt: new Date().toISOString(),
    };
  });

  fastify.post('/abuse/ignore/:tenantId', async (req, reply) => {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant');
    try { await redis.sadd('abuse:ignored', tenantId); } catch {}
    return reply.send({ ok: true });
  });

  fastify.delete('/abuse/ignore/:tenantId', async (req, reply) => {
    const { tenantId } = req.params;
    try { await redis.srem('abuse:ignored', tenantId); } catch {}
    return reply.send({ ok: true });
  });

  // ── Platform config ───────────────────────────────────────────────────────

  const PLATFORM_CONFIG_KEY = 'platform:config';

  const DEFAULT_CONFIG = {
    maintenanceMode: false,
    registrationsOpen: true,
    defaultPlan: 'free',
    signupRequiresApproval: false,
    maxBucketsPerTenant: 100,
    maxObjectsPerBucket: 100000,
    maxUploadSizeBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    planLimits: {
      free:       { storageCap: 5 * 1024 ** 3,   bucketCap: 3,   rateLimitMax: 1000,   rateLimitWindow: 60 },
      pro:        { storageCap: 100 * 1024 ** 3,  bucketCap: 25,  rateLimitMax: 10000,  rateLimitWindow: 60 },
      enterprise: { storageCap: 0, bucketCap: 0, rateLimitMax: 100000, rateLimitWindow: 60 }, // 0 = unlimited
    },
  };

  async function getConfig() {
    try {
      const stored = await redis.get(PLATFORM_CONFIG_KEY);
      if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  fastify.get('/config', async () => {
    const cfg = await getConfig();
    return { config: cfg, defaults: DEFAULT_CONFIG };
  });

  fastify.put('/config', async (req, reply) => {
    const patch = req.body;

    const VALID_PLANS = ['free', 'pro', 'enterprise'];
    if (patch.defaultPlan && !VALID_PLANS.includes(patch.defaultPlan)) {
      throw new ValidationError('defaultPlan must be free, pro, or enterprise');
    }
    if (patch.maxBucketsPerTenant !== undefined && (patch.maxBucketsPerTenant < 1 || patch.maxBucketsPerTenant > 10000)) {
      throw new ValidationError('maxBucketsPerTenant must be 1–10000');
    }
    if (patch.maxObjectsPerBucket !== undefined && (patch.maxObjectsPerBucket < 1 || patch.maxObjectsPerBucket > 10000000)) {
      throw new ValidationError('maxObjectsPerBucket must be 1–10,000,000');
    }
    if (patch.maxUploadSizeBytes !== undefined && (patch.maxUploadSizeBytes < 1024 * 1024 || patch.maxUploadSizeBytes > 100 * 1024 ** 3)) {
      throw new ValidationError('maxUploadSizeBytes must be 1 MB – 100 GB');
    }

    const current = await getConfig();
    const updated = { ...current, ...patch };
    if (patch.planLimits) {
      updated.planLimits = { ...current.planLimits, ...patch.planLimits };
    }

    try { await redis.set(PLATFORM_CONFIG_KEY, JSON.stringify(updated)); } catch (e) {
      throw new Error('Failed to save config: ' + e.message);
    }

    return { ok: true, config: updated };
  });

  fastify.post('/config/reset', async (req, reply) => {
    try { await redis.del(PLATFORM_CONFIG_KEY); } catch {}
    return reply.send({ ok: true, config: DEFAULT_CONFIG });
  });

  fastify.get('/config/system', async () => {
    const mask = (s) => {
      if (!s) return '(not set)';
      const u = new URL(s.replace('rediss://', 'redis://').replace('postgresql://', 'https://'));
      return `${u.protocol}//${u.username ? '***@' : ''}${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`;
    };

    return {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      backendPort: process.env.BACKEND_PORT || '4000',
      database: mask(process.env.DATABASE_URL),
      redis: mask(process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null)),
      storage: `${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`,
      storageBucket: process.env.MINIO_DEFAULT_BUCKET || 'storagecloud',
    };
  });
}
