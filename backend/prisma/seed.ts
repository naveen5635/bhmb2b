import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding users...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: adminPassword },     // always reset password on reseed
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      name: 'Administrator',
      email: 'admin@frozengoods.com',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'staff' },
    update: { password: staffPassword },     // always reset password on reseed
    create: {
      username: 'staff',
      password: staffPassword,
      role: 'STAFF',
      name: 'Staff User',
      email: 'staff@frozengoods.com',
      isActive: true,
    },
  });

  console.log('Done. Credentials:');
  console.log('  admin / admin123  (Administrator)');
  console.log('  staff / staff123  (Staff)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
