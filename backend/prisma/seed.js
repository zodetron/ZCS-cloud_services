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
    { name: 'Storage', metric: 'storage_bytes', unitPrice: 0.023, unit: 'GB/month', freeQuota: BigInt(5 * 1024 * 1024 * 1024) },
    { name: 'Upload Bandwidth', metric: 'upload_bytes', unitPrice: 0.0, unit: 'GB', freeQuota: BigInt(0) },
    { name: 'Download Bandwidth', metric: 'download_bytes', unitPrice: 0.09, unit: 'GB', freeQuota: BigInt(1024 * 1024 * 1024) },
    { name: 'API Requests', metric: 'request_count', unitPrice: 0.0004, unit: '1000 requests', freeQuota: BigInt(10000) },
  ];

  for (const rule of rules) {
    const existing = await prisma.pricingRule.findFirst({ where: { metric: rule.metric } });
    if (!existing) {
      await prisma.pricingRule.create({ data: rule });
    }
  }

  console.log('Seed complete!');
  console.log('  Admin:  admin@storagecloud.io / admin123');
  console.log('  Tenant: demo@example.com / demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
