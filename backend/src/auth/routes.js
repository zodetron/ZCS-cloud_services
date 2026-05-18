import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../shared/prisma.js';
import { config } from '../config/index.js';

export async function authRoutes(fastify) {
  fastify.post('/register', async (req, reply) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return reply.status(400).send({ error: 'Name, email, and password are required' });
    }

    const existing = await prisma.tenant.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const tenant = await prisma.tenant.create({
      data: { name, email, passwordHash },
    });

    const token = jwt.sign(
      { tenantId: tenant.id, email: tenant.email, role: tenant.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return reply.status(201).send({
      token,
      tenant: { id: tenant.id, name: tenant.name, email: tenant.email, role: tenant.role, plan: tenant.plan },
    });
  });

  fastify.post('/login', async (req, reply) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { email } });

    if (!tenant) {
      // Fall back to admin table
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (!admin) return reply.status(401).send({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { adminId: admin.id, email: admin.email, role: 'platform_admin' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      prisma.auditLog.create({
        data: { action: 'LOGIN_SUCCESS', resource: `admin:${admin.email}`, ipAddress: req.ip || null, userAgent: req.headers['user-agent'] || null },
      }).catch(() => {});

      return reply.send({
        token,
        tenant: { id: admin.id, name: admin.name, email: admin.email, role: 'platform_admin', plan: 'admin' },
      });
    }

    const valid = await bcrypt.compare(password, tenant.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    if (tenant.status !== 'active') {
      return reply.status(403).send({ error: 'Account suspended' });
    }

    const token = jwt.sign(
      { tenantId: tenant.id, email: tenant.email, role: tenant.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    prisma.auditLog.create({
      data: { action: 'LOGIN_SUCCESS', resource: `tenant:${tenant.email}`, tenantId: tenant.id, ipAddress: req.ip || null, userAgent: req.headers['user-agent'] || null },
    }).catch(() => {});

    return reply.send({
      token,
      tenant: { id: tenant.id, name: tenant.name, email: tenant.email, role: tenant.role, plan: tenant.plan },
    });
  });

  fastify.post('/admin/login', async (req, reply) => {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: 'platform_admin' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return reply.send({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  });

  fastify.get('/me', {
    preHandler: async (req, reply) => {
      const { authenticate } = await import('../middleware/auth.js');
      await authenticate(req, reply);
    },
  }, async (req, reply) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { id: true, name: true, email: true, role: true, plan: true, status: true, createdAt: true },
    });

    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
    return reply.send({ tenant });
  });

  fastify.patch('/me', {
    preHandler: async (req, reply) => {
      const { authenticate } = await import('../middleware/auth.js');
      await authenticate(req, reply);
    },
  }, async (req, reply) => {
    const { name, email, currentPassword, newPassword } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    if (newPassword) {
      if (!currentPassword) return reply.status(400).send({ error: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, tenant.passwordHash);
      if (!valid) return reply.status(401).send({ error: 'Current password is incorrect' });
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: updates,
      select: { id: true, name: true, email: true, role: true, plan: true },
    });

    return reply.send({ tenant: updated });
  });
}
