import { prisma } from '../shared/prisma.js';
import { minioClient } from '../shared/minio.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../rate-limit/index.js';
import { config } from '../config/index.js';
import { NotFoundError, ConflictError, ValidationError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

async function emitUsage(tenantId, apiKeyId, eventType, bytes, extra = {}) {
  await prisma.usageEvent.create({
    data: {
      tenantId,
      apiKeyId: apiKeyId || null,
      eventType,
      bytes: BigInt(Math.round(bytes || 0)),
      ...extra,
    },
  }).catch(() => {}); // non-fatal
}

export async function storageRoutes(fastify) {
  fastify.addHook('preHandler', authenticateApiKey);
  fastify.addHook('preHandler', rateLimitMiddleware);

  // ── List buckets ───────────────────────────────────────────────────────────
  fastify.get('/buckets', async (req) => {
    const buckets = await prisma.bucket.findMany({
      where: { tenantId: req.tenantId },
      include: { _count: { select: { objects: true } } },
      orderBy: { createdAt: 'desc' },
    });

    emitUsage(req.tenantId, req.apiKeyId, 'list_buckets', 0, {});

    return { buckets };
  });

  // ── Create bucket ─────────────────────────────────────────────────────────
  fastify.post('/buckets', async (req, reply) => {
    const { name, isPublic = false, region = 'us-east-1' } = req.body;

    if (!name || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(name)) {
      throw new ValidationError('Bucket name must be 3-63 lowercase alphanumeric characters, hyphens allowed');
    }

    const existing = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name } },
    });
    if (existing) throw new ConflictError(`Bucket '${name}' already exists`);

    const minioName = `${req.tenantId}-${name}`;
    await minioClient.makeBucket(minioName, region).catch(() => {});

    const bucket = await prisma.bucket.create({
      data: { tenantId: req.tenantId, name, isPublic, region },
    });

    emitUsage(req.tenantId, req.apiKeyId, 'create_bucket', 0, { bucketName: name });

    return reply.status(201).send({ bucket });
  });

  // ── Delete bucket ─────────────────────────────────────────────────────────
  fastify.delete('/buckets/:name', async (req, reply) => {
    const { name } = req.params;

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const objectCount = await prisma.object.count({ where: { bucketId: bucket.id } });
    if (objectCount > 0) throw new ValidationError('Bucket must be empty before deletion');

    await minioClient.removeBucket(`${req.tenantId}-${name}`).catch(() => {});
    await prisma.bucket.delete({ where: { id: bucket.id } });

    emitUsage(req.tenantId, req.apiKeyId, 'delete_bucket', 0, { bucketName: name });

    return reply.status(204).send();
  });

  // ── List objects ──────────────────────────────────────────────────────────
  fastify.get('/buckets/:name/objects', async (req) => {
    const { name } = req.params;
    const { prefix = '', limit = 100, offset = 0 } = req.query;

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const [objects, total] = await Promise.all([
      prisma.object.findMany({
        where: { bucketId: bucket.id, key: { startsWith: prefix } },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.object.count({
        where: { bucketId: bucket.id, key: { startsWith: prefix } },
      }),
    ]);

    emitUsage(req.tenantId, req.apiKeyId, 'list_objects', 0, { bucketName: name });

    return {
      objects: objects.map((o) => ({ ...o, size: o.size.toString() })),
      total,
      bucket,
    };
  });

  // ── Direct text/JSON upload (used by demo and API) ────────────────────────
  fastify.post('/buckets/:name/upload', async (req, reply) => {
    const { name } = req.params;
    const { key, content, contentType = 'text/plain' } = req.body;

    if (!key || content === undefined) {
      throw new ValidationError('key and content are required');
    }

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const storageKey = `${req.tenantId}/${bucket.id}/${key}`;
    const buffer = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    const bytes = buffer.length;

    try {
      await minioClient.putObject(config.minio.bucket, storageKey, buffer, bytes, { 'Content-Type': contentType });
    } catch (err) {
      logger.error('Storage upload failed', { err: err.message, bucket: config.minio.bucket, storageKey });
      throw err;
    }

    const object = await prisma.object.upsert({
      where: { bucketId_key: { bucketId: bucket.id, key } },
      update: { size: BigInt(bytes), contentType, storageKey, updatedAt: new Date() },
      create: {
        tenantId: req.tenantId,
        bucketId: bucket.id,
        key,
        size: BigInt(bytes),
        contentType,
        storageKey,
      },
    });

    await emitUsage(req.tenantId, req.apiKeyId, 'upload', bytes, { bucketName: name, objectKey: key });

    return reply.status(201).send({
      object: { ...object, size: object.size.toString() },
      bytes,
      cost: +(bytes / (1024 ** 3) * 50).toFixed(8),
    });
  });

  // ── Multipart file upload ─────────────────────────────────────────────────
  fastify.post('/buckets/:name/upload-file', async (req, reply) => {
    const { name } = req.params;

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const data = await req.file();
    if (!data) throw new ValidationError('No file provided');

    const key = req.query.key || data.filename;
    if (!key) throw new ValidationError('Object key required (query ?key= or filename)');

    const chunks = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const bytes = buffer.length;
    const contentType = data.mimetype || 'application/octet-stream';

    const storageKey = `${req.tenantId}/${bucket.id}/${key}`;
    try {
      await minioClient.putObject(config.minio.bucket, storageKey, buffer, bytes, { 'Content-Type': contentType });
    } catch (err) {
      logger.error('Storage upload failed', { err: err.message, bucket: config.minio.bucket, storageKey });
      throw err;
    }

    const object = await prisma.object.upsert({
      where: { bucketId_key: { bucketId: bucket.id, key } },
      update: { size: BigInt(bytes), contentType, storageKey, updatedAt: new Date() },
      create: {
        tenantId: req.tenantId,
        bucketId: bucket.id,
        key,
        size: BigInt(bytes),
        contentType,
        storageKey,
      },
    });

    await emitUsage(req.tenantId, req.apiKeyId, 'upload', bytes, { bucketName: name, objectKey: key });

    return reply.status(201).send({
      object: { ...object, size: object.size.toString() },
      bytes,
      filename: data.filename,
      cost: +(bytes / (1024 ** 3) * 50).toFixed(8),
    });
  });

  // ── Download object ───────────────────────────────────────────────────────
  fastify.get('/buckets/:name/objects/*', async (req, reply) => {
    const { name } = req.params;
    const key = req.params['*'];

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const object = await prisma.object.findUnique({
      where: { bucketId_key: { bucketId: bucket.id, key } },
    });
    if (!object) throw new NotFoundError('Object');

    const stream = await minioClient.getObject(config.minio.bucket, object.storageKey);

    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const data = Buffer.concat(chunks);

    await emitUsage(req.tenantId, req.apiKeyId, 'download', Number(object.size), {
      bucketName: name,
      objectKey: key,
    });

    reply.header('Content-Type', object.contentType);
    return reply.send(data);
  });

  // ── Delete object ─────────────────────────────────────────────────────────
  fastify.delete('/buckets/:name/objects/*', async (req, reply) => {
    const { name } = req.params;
    const key = req.params['*'];

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const object = await prisma.object.findUnique({
      where: { bucketId_key: { bucketId: bucket.id, key } },
    });
    if (!object) throw new NotFoundError('Object');

    await minioClient.removeObject(config.minio.bucket, object.storageKey).catch(() => {});
    await prisma.object.delete({ where: { id: object.id } });

    emitUsage(req.tenantId, req.apiKeyId, 'delete', 0, { bucketName: name, objectKey: key });

    return reply.status(204).send();
  });

  // ── Presigned upload URL ─────────────────────────────────────────────────
  fastify.post('/presign/upload', async (req, reply) => {
    const { bucketName, key, contentType = 'application/octet-stream', expiresIn = 3600 } = req.body;

    if (!bucketName || !key) throw new ValidationError('bucketName and key are required');

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name: bucketName } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const storageKey = `${req.tenantId}/${bucket.id}/${key}`;
    const url = await minioClient.presignedPutObject(config.minio.bucket, storageKey, expiresIn);

    emitUsage(req.tenantId, req.apiKeyId, 'presign_upload', 0, { bucketName, objectKey: key });

    return reply.send({ url, storageKey, expiresIn, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() });
  });

  // ── Presigned download URL ───────────────────────────────────────────────
  fastify.post('/presign/download', async (req, reply) => {
    const { bucketName, key, expiresIn = 3600 } = req.body;

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name: bucketName } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const object = await prisma.object.findUnique({
      where: { bucketId_key: { bucketId: bucket.id, key } },
    });
    if (!object) throw new NotFoundError('Object');

    const url = await minioClient.presignedGetObject(config.minio.bucket, object.storageKey, expiresIn);

    emitUsage(req.tenantId, req.apiKeyId, 'presign_download', 0, { bucketName, objectKey: key });

    return reply.send({ url, expiresIn });
  });

  // ── Confirm upload (after presigned) ─────────────────────────────────────
  fastify.post('/objects/confirm', async (req, reply) => {
    const { bucketName, key, storageKey, size, contentType, metadata } = req.body;

    const bucket = await prisma.bucket.findUnique({
      where: { tenantId_name: { tenantId: req.tenantId, name: bucketName } },
    });
    if (!bucket) throw new NotFoundError('Bucket');

    const object = await prisma.object.upsert({
      where: { bucketId_key: { bucketId: bucket.id, key } },
      update: { size: BigInt(size || 0), contentType, metadata, storageKey, updatedAt: new Date() },
      create: {
        tenantId: req.tenantId,
        bucketId: bucket.id,
        key,
        size: BigInt(size || 0),
        contentType: contentType || 'application/octet-stream',
        storageKey,
        metadata,
      },
    });

    await emitUsage(req.tenantId, req.apiKeyId, 'upload', size || 0, { bucketName, objectKey: key });

    return reply.status(201).send({ object: { ...object, size: object.size.toString() } });
  });

  // ── Search buckets + objects ──────────────────────────────────────────────
  fastify.get('/search', async (req) => {
    const { q = '' } = req.query;
    const term = q.trim();
    if (!term) return { buckets: [], objects: [] };

    const [buckets, objects] = await Promise.all([
      prisma.bucket.findMany({
        where: {
          tenantId: req.tenantId,
          name: { contains: term, mode: 'insensitive' },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.object.findMany({
        where: {
          tenantId: req.tenantId,
          key: { contains: term, mode: 'insensitive' },
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { bucket: { select: { name: true } } },
      }),
    ]);

    return {
      buckets,
      objects: objects.map((o) => ({ ...o, size: o.size.toString() })),
    };
  });
}
