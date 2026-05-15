import crypto from 'crypto';
import { prisma } from '../shared/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';

function generateApiKey() {
  const prefix = 'sk_live_';
  const random = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${random}`;
}

export async function apiKeyRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (req) => {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId: req.tenantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { keys };
  });

  fastify.post('/', async (req, reply) => {
    const { name, permissions = ['read', 'write'], expiresIn } = req.body;

    if (!name) throw new ValidationError('API key name is required');

    const rawKey = generateApiKey();
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12) + '...';

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    const key = await prisma.apiKey.create({
      data: {
        tenantId: req.tenantId,
        name,
        keyHash,
        keyPrefix,
        permissions,
        expiresAt,
      },
    });

    return reply.status(201).send({
      key: {
        id: key.id,
        name: key.name,
        key: rawKey,
        keyPrefix: key.keyPrefix,
        permissions: key.permissions,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      },
      message: 'Store this key securely — it will not be shown again',
    });
  });

  fastify.patch('/:id/revoke', async (req, reply) => {
    const { id } = req.params;

    const key = await prisma.apiKey.findFirst({
      where: { id, tenantId: req.tenantId },
    });
    if (!key) throw new NotFoundError('API key');

    await prisma.apiKey.update({
      where: { id },
      data: { status: 'revoked' },
    });

    return reply.send({ message: 'API key revoked' });
  });

  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params;

    const key = await prisma.apiKey.findFirst({
      where: { id, tenantId: req.tenantId },
    });
    if (!key) throw new NotFoundError('API key');

    await prisma.apiKey.delete({ where: { id } });
    return reply.status(204).send();
  });
}
