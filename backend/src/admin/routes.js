import { prisma } from '../shared/prisma.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { NotFoundError } from '../shared/errors.js';

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
    return reply.send({ message: `Tenant ${status}` });
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

  fastify.get('/audit-logs', async (req) => {
    const { limit = 50, tenantId } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });
    return { logs };
  });
}
