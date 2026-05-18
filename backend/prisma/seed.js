import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.admin.upsert({
    where: { email: 'admin@storagecloud.io' },
    update: {},
    create: {
      email: 'admin@storagecloud.io',
      passwordHash: adminHash,
      name: 'Platform Admin',
      role: 'platform_admin',
    },
  });

  const tenantHash = await bcrypt.hash('demo123', 12);
  await prisma.tenant.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      name: 'Demo Corp',
      email: 'demo@example.com',
      passwordHash: tenantHash,
      plan: 'pro',
    },
  });

  const rules = [
    { name: 'Storage', metric: 'storage_bytes', unitPrice: 50, unit: 'GB/month', freeQuota: BigInt(5 * 1024 * 1024 * 1024) },
    { name: 'Upload Bandwidth', metric: 'upload_bytes', unitPrice: 30, unit: 'GB', freeQuota: BigInt(0) },
    { name: 'Download Bandwidth', metric: 'download_bytes', unitPrice: 20, unit: 'GB', freeQuota: BigInt(1024 * 1024 * 1024) },
    { name: 'API Requests', metric: 'request_count', unitPrice: 500, unit: '1000 requests', freeQuota: BigInt(10000) },
  ];

  for (const rule of rules) {
    const existing = await prisma.pricingRule.findFirst({ where: { metric: rule.metric } });
    if (!existing) {
      await prisma.pricingRule.create({ data: rule });
    }
  }

  const tenant = await prisma.tenant.findUnique({ where: { email: 'demo@example.com' } });

  const existingLogs = await prisma.auditLog.count();
  if (existingLogs === 0 && tenant) {
    const now = Date.now();
    await prisma.auditLog.createMany({
      data: [
        { action: 'TENANT_CREATED',   resource: `tenant:${tenant.id}`,         tenantId: tenant.id, createdAt: new Date(now - 7 * 86400000) },
        { action: 'LOGIN_SUCCESS',    resource: `tenant:${tenant.email}`,       tenantId: tenant.id, createdAt: new Date(now - 6 * 86400000) },
        { action: 'BUCKET_CREATED',   resource: `bucket:my-files`,              tenantId: tenant.id, createdAt: new Date(now - 5 * 86400000) },
        { action: 'API_KEY_CREATED',  resource: `apikey:prod-key`,              tenantId: tenant.id, createdAt: new Date(now - 4 * 86400000) },
        { action: 'BUCKET_CREATED',   resource: `bucket:backups`,               tenantId: tenant.id, createdAt: new Date(now - 3 * 86400000) },
        { action: 'PRICING_UPDATED',  resource: `pricing:global`,               tenantId: null,      createdAt: new Date(now - 2 * 86400000) },
        { action: 'PLAN_CHANGED',     resource: `tenant:${tenant.id}`,          tenantId: tenant.id, createdAt: new Date(now - 86400000), details: { previousPlan: 'free', newPlan: 'pro' } },
        { action: 'LOGIN_SUCCESS',    resource: `admin:admin@storagecloud.io`,   tenantId: null,      createdAt: new Date(now - 3600000) },
        { action: 'LOGIN_SUCCESS',    resource: `tenant:${tenant.email}`,       tenantId: tenant.id, createdAt: new Date(now - 1800000) },
        { action: 'RATE_LIMIT_UPDATED', resource: `tenant:${tenant.id}`,        tenantId: tenant.id, createdAt: new Date(now - 900000), details: { rateLimitMax: 2000 } },
      ],
    });
  }

  console.log('Seed complete!');
  console.log('  Admin:  admin@storagecloud.io / admin123');
  console.log('  Tenant: demo@example.com / demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
