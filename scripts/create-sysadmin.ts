import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Check if sysadmin already exists
  const existing = await prisma.user.findFirst({ where: { email: 'sysadmin@insa365.com' } });
  if (existing) {
    console.log('sysadmin already exists:', existing.id);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  // Create system company
  let systemCompany = await prisma.company.findFirst({ where: { businessNumber: '000-00-00000' } });
  if (!systemCompany) {
    systemCompany = await prisma.company.create({
      data: {
        name: 's1-insa365 시스템',
        businessNumber: '000-00-00000',
        representativeName: '시스템',
        address: '',
        phone: '',
        email: 'system@insa365.com',
        payDay: 25,
        monthlyWorkHours: 209,
      },
    });
    console.log('System company created:', systemCompany.id);
  }

  // Create sysadmin user
  const password = await bcrypt.hash('sysadmin123!', 10);
  const user = await prisma.user.create({
    data: {
      companyId: systemCompany.id,
      email: 'sysadmin@insa365.com',
      password,
      name: '시스템관리자',
      role: 'SYSTEM_ADMIN',
      employeeNumber: 'SYS001',
      employeeStatus: 'ACTIVE',
      canViewSensitive: true,
      joinDate: new Date('2024-01-01'),
    },
  });
  console.log('sysadmin created:', user.id, user.email);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
