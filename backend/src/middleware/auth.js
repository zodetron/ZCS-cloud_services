import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../shared/prisma.js';

export async function authenticate(req, reply) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.secret);
    req.tenantId = payload.tenantId;
    req.role = payload.role;
    req.tenantEmail = payload.email;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

export async function authenticateAdmin(req, reply) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.secret);

    if (payload.role !== 'platform_admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    req.adminId = payload.adminId;
    req.role = payload.role;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

export async function authenticateApiKey(req, reply) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return authenticate(req, reply);
  }

  try {
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const key = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { tenant: true },
    });

    if (!key || key.status !== 'active') {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'API key expired' });
    }

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    req.tenantId = key.tenantId;
    req.apiKeyId = key.id;
    req.role = 'developer';
    req.apiKeyPermissions = key.permissions;
  } catch {
    return reply.status(401).send({ error: 'Authentication failed' });
  }
}
