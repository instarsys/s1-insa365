import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create test company
  const company = await prisma.company.create({
    data: {
      name: '테스트 주식회사',
      businessNumber: '123-45-67890',
      representativeName: '홍길동',
      address: '서울특별시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      email: 'admin@test-company.com',
      payDay: 25,
      monthlyWorkHours: 209,
    },
  });
  console.log('Company created:', company.name);

  // 5 Departments
  const departments = await Promise.all([
    prisma.department.create({ data: { companyId: company.id, name: '경영지원팀', code: 'DEPT-001', sortOrder: 1 } }),
    prisma.department.create({ data: { companyId: company.id, name: '개발팀', code: 'DEPT-002', sortOrder: 2 } }),
    prisma.department.create({ data: { companyId: company.id, name: '영업팀', code: 'DEPT-003', sortOrder: 3 } }),
    prisma.department.create({ data: { companyId: company.id, name: '마케팅팀', code: 'DEPT-004', sortOrder: 4 } }),
    prisma.department.create({ data: { companyId: company.id, name: '인사팀', code: 'DEPT-005', sortOrder: 5 } }),
  ]);
  console.log('Departments created:', departments.length);

  // 5 Positions
  const positions = await Promise.all([
    prisma.position.create({ data: { companyId: company.id, name: '대표이사', level: 1 } }),
    prisma.position.create({ data: { companyId: company.id, name: '이사', level: 2 } }),
    prisma.position.create({ data: { companyId: company.id, name: '부장', level: 3 } }),
    prisma.position.create({ data: { companyId: company.id, name: '과장', level: 4 } }),
    prisma.position.create({ data: { companyId: company.id, name: '사원', level: 5 } }),
  ]);
  console.log('Positions created:', positions.length);

  // 1 Default Work Policy (09:00-18:00, 60min break, Mon-Fri)
  await prisma.workPolicy.create({
    data: {
      companyId: company.id,
      name: '기본 근무정책',
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      workDays: '1,2,3,4,5',
      isDefault: true,
    },
  });
  console.log('Work policy created');

  // 1 Default Work Location
  await prisma.workLocation.create({
    data: {
      companyId: company.id,
      name: '본사',
      address: '서울특별시 강남구 테헤란로 123',
      latitude: 37.5065,
      longitude: 127.0536,
      radiusMeters: 200,
      isDefault: true,
    },
  });
  console.log('Work location created');

  // 11 Allowance Rules (A01-A11)
  const allowanceRules = [
    { code: 'A01', name: '기본급', type: 'BASE' as const, isOrdinaryWage: true, sortOrder: 1 },
    { code: 'A02', name: '직책수당', type: 'ALLOWANCE' as const, isOrdinaryWage: true, sortOrder: 2 },
    { code: 'A03', name: '자격수당', type: 'ALLOWANCE' as const, isOrdinaryWage: true, sortOrder: 3 },
    { code: 'A04', name: '근속수당', type: 'ALLOWANCE' as const, isOrdinaryWage: true, sortOrder: 4 },
    { code: 'A05', name: '식대', type: 'ALLOWANCE' as const, isTaxExempt: true, taxExemptCode: 'MEALS', defaultAmount: 200000, sortOrder: 5 },
    { code: 'A06', name: '차량유지비', type: 'ALLOWANCE' as const, isTaxExempt: true, taxExemptCode: 'VEHICLE', defaultAmount: 200000, sortOrder: 6 },
    { code: 'A07', name: '보육수당', type: 'ALLOWANCE' as const, isTaxExempt: true, taxExemptCode: 'CHILDCARE', sortOrder: 7 },
    { code: 'A08', name: '연장근로수당', type: 'ALLOWANCE' as const, paymentType: 'FORMULA' as const, formula: 'OVERTIME', sortOrder: 8 },
    { code: 'A09', name: '야간근로수당', type: 'ALLOWANCE' as const, paymentType: 'FORMULA' as const, formula: 'NIGHT', sortOrder: 9 },
    { code: 'A10', name: '휴일근로수당', type: 'ALLOWANCE' as const, paymentType: 'FORMULA' as const, formula: 'HOLIDAY', sortOrder: 10 },
    { code: 'A11', name: '상여금', type: 'ALLOWANCE' as const, paymentType: 'VARIABLE' as const, paymentCycle: 'QUARTERLY' as const, sortOrder: 11 },
  ];

  for (const rule of allowanceRules) {
    await prisma.salaryRule.create({
      data: {
        companyId: company.id,
        code: rule.code,
        name: rule.name,
        type: rule.type,
        paymentType: rule.paymentType || 'FIXED',
        paymentCycle: rule.paymentCycle || 'MONTHLY',
        defaultAmount: rule.defaultAmount,
        isOrdinaryWage: rule.isOrdinaryWage || false,
        isTaxExempt: rule.isTaxExempt || false,
        taxExemptCode: rule.taxExemptCode,
        formula: rule.formula,
        sortOrder: rule.sortOrder,
      },
    });
  }
  console.log('Allowance rules created:', allowanceRules.length);

  // 12 Deduction Rules (D01-D12)
  const deductionRules = [
    { code: 'D01', name: '국민연금', formula: 'NATIONAL_PENSION', sortOrder: 1 },
    { code: 'D02', name: '건강보험', formula: 'HEALTH_INSURANCE', sortOrder: 2 },
    { code: 'D03', name: '장기요양보험', formula: 'LONG_TERM_CARE', sortOrder: 3 },
    { code: 'D04', name: '고용보험', formula: 'EMPLOYMENT_INSURANCE', sortOrder: 4 },
    { code: 'D05', name: '소득세', formula: 'INCOME_TAX', sortOrder: 5 },
    { code: 'D06', name: '지방소득세', formula: 'LOCAL_INCOME_TAX', sortOrder: 6 },
    { code: 'D07', name: '노조비', sortOrder: 7 },
    { code: 'D08', name: '사원 대출금', sortOrder: 8 },
    { code: 'D09', name: '기숙사비', sortOrder: 9 },
    { code: 'D10', name: '가불금', sortOrder: 10 },
    { code: 'D11', name: '기타 공제1', sortOrder: 11 },
    { code: 'D12', name: '기타 공제2', sortOrder: 12 },
  ];

  for (const rule of deductionRules) {
    await prisma.salaryRule.create({
      data: {
        companyId: company.id,
        code: rule.code,
        name: rule.name,
        type: 'DEDUCTION',
        paymentType: rule.formula ? 'FORMULA' : 'FIXED',
        formula: rule.formula,
        sortOrder: rule.sortOrder,
      },
    });
  }
  console.log('Deduction rules created:', deductionRules.length);

  // 2 Minimum Wages (2025, 2026)
  await prisma.minimumWage.createMany({
    data: [
      { year: 2025, hourlyWage: 10030, monthlyWage: 2096270 },
      { year: 2026, hourlyWage: 10320, monthlyWage: 2156880 },
    ],
  });
  console.log('Minimum wages created');

  // 3 Tax-Exempt Limits (2025)
  await prisma.taxExemptLimit.createMany({
    data: [
      { year: 2025, code: 'MEALS', name: '식대', monthlyLimit: 200000 },
      { year: 2025, code: 'VEHICLE', name: '차량유지비', monthlyLimit: 200000 },
      { year: 2025, code: 'CHILDCARE', name: '보육수당', monthlyLimit: 200000 },
    ],
  });
  console.log('Tax-exempt limits created');

  // Insurance Rates (2025)
  const rateData = [
    // National Pension 2025 H1
    { type: 'NATIONAL_PENSION', employeeRate: 0.045, employerRate: 0.045, minBase: 390000, maxBase: 6170000, start: '2025-01-01', end: '2025-06-30' },
    // National Pension 2025 H2
    { type: 'NATIONAL_PENSION', employeeRate: 0.045, employerRate: 0.045, minBase: 400000, maxBase: 6370000, start: '2025-07-01', end: '2025-12-31' },
    // Health Insurance 2025
    { type: 'HEALTH_INSURANCE', employeeRate: 0.03545, employerRate: 0.03545, minBase: 279000, maxBase: 12706000, start: '2025-01-01', end: '2025-12-31' },
    // Long-term Care 2025
    { type: 'LONG_TERM_CARE', employeeRate: 0.1295, employerRate: 0.1295, minBase: null, maxBase: null, start: '2025-01-01', end: '2025-12-31' },
    // Employment Insurance 2025
    { type: 'EMPLOYMENT_INSURANCE', employeeRate: 0.009, employerRate: 0.009, minBase: null, maxBase: null, start: '2025-01-01', end: '2025-12-31' },
  ];

  for (const r of rateData) {
    await prisma.insuranceRate.create({
      data: {
        type: r.type,
        employeeRate: r.employeeRate,
        employerRate: r.employerRate,
        minBase: r.minBase,
        maxBase: r.maxBase,
        effectiveStartDate: new Date(r.start),
        effectiveEndDate: new Date(r.end),
      },
    });
  }
  console.log('Insurance rates created:', rateData.length);

  // 10 Legal Parameters
  const legalParams = [
    { category: 'WORK_HOURS' as const, key: 'MONTHLY_WORK_HOURS', value: '209', description: '월 소정근로시간', unit: '시간' },
    { category: 'WORK_HOURS' as const, key: 'WEEKLY_WORK_LIMIT', value: '52', description: '주 최대 근로시간', unit: '시간' },
    { category: 'WORK_HOURS' as const, key: 'WEEKLY_REGULAR_HOURS', value: '40', description: '주 소정근로시간', unit: '시간' },
    { category: 'WORK_HOURS' as const, key: 'WEEKLY_WARNING_HOURS', value: '48', description: '52시간 경고 기준', unit: '시간' },
    { category: 'OVERTIME' as const, key: 'OVERTIME_RATE', value: '1.5', description: '연장근로 가산율' },
    { category: 'OVERTIME' as const, key: 'NIGHT_RATE', value: '0.5', description: '야간근로 가산율 (추가분)' },
    { category: 'OVERTIME' as const, key: 'HOLIDAY_RATE_WITHIN_8H', value: '1.5', description: '휴일근로 8시간 이내 가산율' },
    { category: 'OVERTIME' as const, key: 'HOLIDAY_RATE_OVER_8H', value: '2.0', description: '휴일근로 8시간 초과 가산율' },
    { category: 'OVERTIME' as const, key: 'NIGHT_WORK_START', value: '22:00', description: '야간근로 시작시간' },
    { category: 'OVERTIME' as const, key: 'NIGHT_WORK_END', value: '06:00', description: '야간근로 종료시간' },
  ];

  for (const p of legalParams) {
    await prisma.legalParameter.create({
      data: {
        category: p.category,
        key: p.key,
        value: p.value,
        description: p.description,
        unit: p.unit,
      },
    });
  }
  console.log('Legal parameters created:', legalParams.length);

  // Admin user (password: admin123!)
  const hashedPassword = await bcrypt.hash('admin123!', 10);

  await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'admin@test-company.com',
      password: hashedPassword,
      name: '관리자',
      role: 'COMPANY_ADMIN',
      employeeNumber: 'EA0001',
      employeeStatus: 'ACTIVE',
      departmentId: departments[0].id,
      positionId: positions[0].id,
      joinDate: new Date('2024-01-01'),
      canViewSensitive: true,
      dependents: 1,
    },
  });
  console.log('Admin user created');

  console.log('');
  console.log('=== Seed Complete ===');
  console.log('Company:', company.name);
  console.log('Admin login: admin@test-company.com / admin123!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
