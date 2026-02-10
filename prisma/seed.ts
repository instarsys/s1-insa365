import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create test company (idempotent)
  let company = await prisma.company.findFirst({ where: { businessNumber: '123-45-67890' } });
  if (!company) {
    company = await prisma.company.create({
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
  } else {
    console.log('Company already exists:', company.name);
    // 회사가 이미 존재하면 휴가 시드만 추가 실행
    await seedLeaveData(company.id);
    return;
  }
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
  const workPolicy = await prisma.workPolicy.create({
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
  const workLocation = await prisma.workLocation.create({
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
    skipDuplicates: true,
  });
  console.log('Minimum wages created');

  // 3 Tax-Exempt Limits (2025)
  await prisma.taxExemptLimit.createMany({
    data: [
      { year: 2025, code: 'MEALS', name: '식대', monthlyLimit: 200000 },
      { year: 2025, code: 'VEHICLE', name: '차량유지비', monthlyLimit: 200000 },
      { year: 2025, code: 'CHILDCARE', name: '보육수당', monthlyLimit: 200000 },
    ],
    skipDuplicates: true,
  });
  console.log('Tax-exempt limits created');

  // Insurance Rates (2025)
  const rateData = [
    { type: 'NATIONAL_PENSION', employeeRate: 0.045, employerRate: 0.045, minBase: 390000, maxBase: 6170000, start: '2025-01-01', end: '2025-06-30' },
    { type: 'NATIONAL_PENSION', employeeRate: 0.045, employerRate: 0.045, minBase: 400000, maxBase: 6370000, start: '2025-07-01', end: '2025-12-31' },
    { type: 'HEALTH_INSURANCE', employeeRate: 0.03545, employerRate: 0.03545, minBase: 279000, maxBase: 12706000, start: '2025-01-01', end: '2025-12-31' },
    { type: 'LONG_TERM_CARE', employeeRate: 0.1295, employerRate: 0.1295, minBase: null, maxBase: null, start: '2025-01-01', end: '2025-12-31' },
    { type: 'EMPLOYMENT_INSURANCE', employeeRate: 0.009, employerRate: 0.009, minBase: null, maxBase: null, start: '2025-01-01', end: '2025-12-31' },
  ];

  for (const r of rateData) {
    const existing = await prisma.insuranceRate.findFirst({
      where: { type: r.type, effectiveStartDate: new Date(r.start) },
    });
    if (!existing) {
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
    const existing = await prisma.legalParameter.findFirst({
      where: { key: p.key },
    });
    if (!existing) {
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
  }
  console.log('Legal parameters created:', legalParams.length);

  // ──────────────────────────────────────────────
  // Admin user (password: admin123!)
  // ──────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123!', 10);

  const adminUser = await prisma.user.create({
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
      workPolicyId: workPolicy.id,
      workLocationId: workLocation.id,
    },
  });
  console.log('Admin user created');

  // ──────────────────────────────────────────────
  // 15 Test Employees (spread across 5 departments)
  // ──────────────────────────────────────────────
  const employeePassword = await bcrypt.hash('test1234!', 10);

  const employeeData = [
    // 경영지원팀 (10명)
    { name: '김영수', email: 'kim.ys@test-company.com', num: 'EA0002', dept: 0, pos: 2, base: 4500000, joinDate: '2023-03-15', dependents: 3 },
    { name: '박지민', email: 'park.jm@test-company.com', num: 'EA0003', dept: 0, pos: 3, base: 3800000, joinDate: '2023-06-01', dependents: 2 },
    { name: '이서연', email: 'lee.sy@test-company.com', num: 'EA0004', dept: 0, pos: 4, base: 3000000, joinDate: '2024-02-01', dependents: 1 },
    { name: '장민석', email: 'jang.ms@test-company.com', num: 'EA0018', dept: 0, pos: 4, base: 3100000, joinDate: '2024-05-01', dependents: 1 },
    { name: '노현정', email: 'noh.hj@test-company.com', num: 'EA0019', dept: 0, pos: 4, base: 2900000, joinDate: '2024-08-01', dependents: 1 },
    { name: '문경태', email: 'moon.kt@test-company.com', num: 'EA0020', dept: 0, pos: 3, base: 3700000, joinDate: '2023-09-01', dependents: 2 },
    { name: '양수빈', email: 'yang.sb@test-company.com', num: 'EA0021', dept: 0, pos: 4, base: 3200000, joinDate: '2024-01-15', dependents: 1 },
    { name: '권도윤', email: 'kwon.dy@test-company.com', num: 'EA0022', dept: 0, pos: 4, base: 2800000, joinDate: '2025-01-06', dependents: 1 },
    { name: '유정아', email: 'yoo.ja@test-company.com', num: 'EA0023', dept: 0, pos: 3, base: 4000000, joinDate: '2022-11-01', dependents: 3 },
    { name: '남기훈', email: 'nam.kh@test-company.com', num: 'EA0024', dept: 0, pos: 4, base: 3300000, joinDate: '2023-12-01', dependents: 1 },
    // 개발팀 (12명)
    { name: '정민호', email: 'jung.mh@test-company.com', num: 'EA0005', dept: 1, pos: 2, base: 5200000, joinDate: '2022-09-01', dependents: 2 },
    { name: '최수현', email: 'choi.sh@test-company.com', num: 'EA0006', dept: 1, pos: 3, base: 4200000, joinDate: '2023-01-15', dependents: 1 },
    { name: '한지우', email: 'han.jw@test-company.com', num: 'EA0007', dept: 1, pos: 4, base: 3500000, joinDate: '2024-01-02', dependents: 1 },
    { name: '윤도현', email: 'yoon.dh@test-company.com', num: 'EA0008', dept: 1, pos: 4, base: 3200000, joinDate: '2024-06-01', dependents: 1 },
    { name: '백승우', email: 'baek.sw@test-company.com', num: 'EA0025', dept: 1, pos: 3, base: 4400000, joinDate: '2022-12-01', dependents: 2 },
    { name: '구하린', email: 'goo.hr@test-company.com', num: 'EA0026', dept: 1, pos: 4, base: 3600000, joinDate: '2023-07-01', dependents: 1 },
    { name: '진성민', email: 'jin.sm@test-company.com', num: 'EA0027', dept: 1, pos: 4, base: 3400000, joinDate: '2024-03-01', dependents: 1 },
    { name: '류지현', email: 'ryu.jh@test-company.com', num: 'EA0028', dept: 1, pos: 4, base: 3100000, joinDate: '2024-09-01', dependents: 1 },
    { name: '송태양', email: 'song.ty@test-company.com', num: 'EA0029', dept: 1, pos: 3, base: 4100000, joinDate: '2023-04-15', dependents: 1 },
    { name: '안예진', email: 'ahn.yj@test-company.com', num: 'EA0030', dept: 1, pos: 4, base: 3300000, joinDate: '2024-07-01', dependents: 1 },
    { name: '하준서', email: 'ha.js@test-company.com', num: 'EA0031', dept: 1, pos: 4, base: 2900000, joinDate: '2025-01-02', dependents: 1 },
    { name: '탁민재', email: 'tak.mj@test-company.com', num: 'EA0032', dept: 1, pos: 4, base: 3000000, joinDate: '2024-11-01', dependents: 1 },
    // 영업팀 (10명)
    { name: '강태우', email: 'kang.tw@test-company.com', num: 'EA0009', dept: 2, pos: 2, base: 4800000, joinDate: '2022-07-01', dependents: 4 },
    { name: '오지수', email: 'oh.js@test-company.com', num: 'EA0010', dept: 2, pos: 3, base: 3600000, joinDate: '2023-11-01', dependents: 1 },
    { name: '신하늘', email: 'shin.hn@test-company.com', num: 'EA0011', dept: 2, pos: 4, base: 2800000, joinDate: '2025-01-02', dependents: 1 },
    { name: '전유진', email: 'jeon.yj@test-company.com', num: 'EA0033', dept: 2, pos: 3, base: 3900000, joinDate: '2023-05-01', dependents: 2 },
    { name: '곽동현', email: 'kwak.dh@test-company.com', num: 'EA0034', dept: 2, pos: 4, base: 3200000, joinDate: '2024-02-15', dependents: 1 },
    { name: '변서윤', email: 'byun.sy@test-company.com', num: 'EA0035', dept: 2, pos: 4, base: 3000000, joinDate: '2024-06-01', dependents: 1 },
    { name: '추성호', email: 'choo.sh@test-company.com', num: 'EA0036', dept: 2, pos: 4, base: 3100000, joinDate: '2024-04-01', dependents: 1 },
    { name: '허나영', email: 'heo.ny@test-company.com', num: 'EA0037', dept: 2, pos: 3, base: 3800000, joinDate: '2023-03-01', dependents: 2 },
    { name: '윤성준', email: 'yoons.j@test-company.com', num: 'EA0038', dept: 2, pos: 4, base: 3400000, joinDate: '2023-10-01', dependents: 1 },
    { name: '봉지훈', email: 'bong.jh@test-company.com', num: 'EA0039', dept: 2, pos: 4, base: 2900000, joinDate: '2024-10-01', dependents: 1 },
    // 마케팅팀 (10명)
    { name: '임수정', email: 'lim.sj@test-company.com', num: 'EA0012', dept: 3, pos: 2, base: 4300000, joinDate: '2023-04-01', dependents: 2 },
    { name: '서준혁', email: 'seo.jh@test-company.com', num: 'EA0013', dept: 3, pos: 3, base: 3700000, joinDate: '2023-08-01', dependents: 1 },
    { name: '황미영', email: 'hwang.my@test-company.com', num: 'EA0014', dept: 3, pos: 4, base: 3100000, joinDate: '2024-04-01', dependents: 1 },
    { name: '차은별', email: 'cha.eb@test-company.com', num: 'EA0040', dept: 3, pos: 3, base: 3800000, joinDate: '2023-06-15', dependents: 2 },
    { name: '피승환', email: 'pi.sh@test-company.com', num: 'EA0041', dept: 3, pos: 4, base: 3200000, joinDate: '2024-01-02', dependents: 1 },
    { name: '도하은', email: 'do.he@test-company.com', num: 'EA0042', dept: 3, pos: 4, base: 2900000, joinDate: '2024-08-01', dependents: 1 },
    { name: '고영택', email: 'go.yt@test-company.com', num: 'EA0043', dept: 3, pos: 4, base: 3300000, joinDate: '2023-11-01', dependents: 1 },
    { name: '성다인', email: 'sung.di@test-company.com', num: 'EA0044', dept: 3, pos: 4, base: 3000000, joinDate: '2024-05-01', dependents: 1 },
    { name: '우진호', email: 'woo.jh@test-company.com', num: 'EA0045', dept: 3, pos: 3, base: 4000000, joinDate: '2022-10-01', dependents: 3 },
    { name: '소예림', email: 'so.yr@test-company.com', num: 'EA0046', dept: 3, pos: 4, base: 3100000, joinDate: '2024-07-01', dependents: 1 },
    // 인사팀 (8명)
    { name: '조현우', email: 'cho.hw@test-company.com', num: 'EA0015', dept: 4, pos: 3, base: 3900000, joinDate: '2023-02-01', dependents: 2 },
    { name: '배소라', email: 'bae.sr@test-company.com', num: 'EA0016', dept: 4, pos: 4, base: 3000000, joinDate: '2024-03-01', dependents: 1 },
    { name: '감민수', email: 'gam.ms@test-company.com', num: 'EA0047', dept: 4, pos: 2, base: 4600000, joinDate: '2022-05-01', dependents: 3 },
    { name: '표지연', email: 'pyo.jy@test-company.com', num: 'EA0048', dept: 4, pos: 3, base: 3700000, joinDate: '2023-07-01', dependents: 1 },
    { name: '태원석', email: 'tae.ws@test-company.com', num: 'EA0049', dept: 4, pos: 4, base: 3200000, joinDate: '2024-02-01', dependents: 1 },
    { name: '방혜수', email: 'bang.hs@test-company.com', num: 'EA0050', dept: 4, pos: 4, base: 2800000, joinDate: '2024-09-01', dependents: 1 },
    { name: '엄준기', email: 'eom.jg@test-company.com', num: 'EA0051', dept: 4, pos: 4, base: 3100000, joinDate: '2024-06-01', dependents: 1 },
    { name: '빈나래', email: 'bin.nr@test-company.com', num: 'EA0052', dept: 4, pos: 4, base: 2900000, joinDate: '2025-01-06', dependents: 1 },
  ];

  const employees = [];
  for (const emp of employeeData) {
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: emp.email,
        password: employeePassword,
        name: emp.name,
        role: 'EMPLOYEE',
        employeeNumber: emp.num,
        employeeStatus: 'ACTIVE',
        departmentId: departments[emp.dept].id,
        positionId: positions[emp.pos].id,
        joinDate: new Date(emp.joinDate),
        dependents: emp.dependents,
        workPolicyId: workPolicy.id,
        workLocationId: workLocation.id,
      },
    });
    employees.push({ ...user, baseSalary: emp.base });
  }
  console.log('Test employees created:', employees.length);

  // ──────────────────────────────────────────────
  // Employee Salary Items (per-employee)
  // ──────────────────────────────────────────────
  // Each employee gets: A01 (base), A02 (position allowance), A05 (meals), D01-D06 (insurance/tax formulas)
  for (const emp of employees) {
    const positionAllowance = emp.baseSalary >= 4500000 ? 500000
      : emp.baseSalary >= 3500000 ? 300000
      : 150000;

    await prisma.employeeSalaryItem.createMany({
      data: [
        { companyId: company.id, userId: emp.id, code: 'A01', name: '기본급', type: 'BASE', paymentType: 'FIXED', amount: emp.baseSalary, isOrdinaryWage: true, sortOrder: 1 },
        { companyId: company.id, userId: emp.id, code: 'A02', name: '직책수당', type: 'ALLOWANCE', paymentType: 'FIXED', amount: positionAllowance, isOrdinaryWage: true, sortOrder: 2 },
        { companyId: company.id, userId: emp.id, code: 'A05', name: '식대', type: 'ALLOWANCE', paymentType: 'FIXED', amount: 200000, isTaxExempt: true, taxExemptCode: 'MEALS', sortOrder: 5 },
        { companyId: company.id, userId: emp.id, code: 'A06', name: '차량유지비', type: 'ALLOWANCE', paymentType: 'FIXED', amount: 200000, isTaxExempt: true, taxExemptCode: 'VEHICLE', sortOrder: 6 },
        { companyId: company.id, userId: emp.id, code: 'A08', name: '연장근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', formula: 'OVERTIME', amount: 0, sortOrder: 8 },
        { companyId: company.id, userId: emp.id, code: 'A09', name: '야간근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', formula: 'NIGHT', amount: 0, sortOrder: 9 },
        { companyId: company.id, userId: emp.id, code: 'A10', name: '휴일근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', formula: 'HOLIDAY', amount: 0, sortOrder: 10 },
      ],
    });
  }
  console.log('Employee salary items created');

  // Also create salary items for the admin user
  await prisma.employeeSalaryItem.createMany({
    data: [
      { companyId: company.id, userId: adminUser.id, code: 'A01', name: '기본급', type: 'BASE', paymentType: 'FIXED', amount: 6000000, isOrdinaryWage: true, sortOrder: 1 },
      { companyId: company.id, userId: adminUser.id, code: 'A02', name: '직책수당', type: 'ALLOWANCE', paymentType: 'FIXED', amount: 800000, isOrdinaryWage: true, sortOrder: 2 },
      { companyId: company.id, userId: adminUser.id, code: 'A05', name: '식대', type: 'ALLOWANCE', paymentType: 'FIXED', amount: 200000, isTaxExempt: true, taxExemptCode: 'MEALS', sortOrder: 5 },
      { companyId: company.id, userId: adminUser.id, code: 'A06', name: '차량유지비', type: 'ALLOWANCE', paymentType: 'FIXED', amount: 200000, isTaxExempt: true, taxExemptCode: 'VEHICLE', sortOrder: 6 },
    ],
  });

  // ──────────────────────────────────────────────
  // Past 2 months attendance data
  // ──────────────────────────────────────────────
  const allUsers = [adminUser, ...employees.map((e) => ({ id: e.id }))];
  const now = new Date();
  const months = [
    { year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), month: now.getMonth() === 0 ? 11 : now.getMonth() - 1 }, // 2 months ago (0-based)
    { year: now.getMonth() <= 1 ? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) : now.getFullYear(), month: now.getMonth() === 0 ? 12 : now.getMonth() }, // last month (1-based for display)
  ];

  // Convert to proper year/month for last 2 calendar months
  const today = new Date();
  const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const attendanceMonths = [
    { year: twoMonthsAgo.getFullYear(), month: twoMonthsAgo.getMonth() + 1, dateObj: twoMonthsAgo },
    { year: lastMonth.getFullYear(), month: lastMonth.getMonth() + 1, dateObj: lastMonth },
  ];

  for (const m of attendanceMonths) {
    const daysInMonth = new Date(m.year, m.month, 0).getDate();

    for (const user of allUsers) {
      let totalRegular = 0;
      let totalOvertime = 0;
      let workDays = 0;
      let actualWorkDays = 0;
      let lateDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(m.year, m.month - 1, day);
        const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        workDays++;

        // Simulate: ~5% chance of absence, ~10% chance late
        const rand = Math.random();
        if (rand < 0.03) continue; // absent
        actualWorkDays++;

        const isLate = rand < 0.13;
        if (isLate) lateDays++;

        // Normal: 480 min (8h), some days overtime (30-120 min)
        const regularMin = 480;
        const hasOvertime = Math.random() < 0.25;
        const overtimeMin = hasOvertime ? Math.floor(Math.random() * 90) + 30 : 0;

        totalRegular += regularMin;
        totalOvertime += overtimeMin;

        const checkInHour = isLate ? 9 + Math.floor(Math.random() * 1) : 8 + Math.floor(Math.random() * 1);
        const checkInMin = isLate ? 10 + Math.floor(Math.random() * 30) : 45 + Math.floor(Math.random() * 15);

        await prisma.attendance.create({
          data: {
            companyId: company.id,
            userId: user.id,
            date,
            checkInTime: new Date(m.year, m.month - 1, day, checkInHour, checkInMin),
            checkOutTime: new Date(m.year, m.month - 1, day, 18 + (hasOvertime ? Math.floor(overtimeMin / 60) : 0), hasOvertime ? overtimeMin % 60 : 0),
            status: isLate ? 'LATE' : 'ON_TIME',
            regularMinutes: regularMin,
            overtimeMinutes: overtimeMin,
            totalMinutes: regularMin + overtimeMin,
            isConfirmed: true,
          },
        });
      }

      // Create SalaryAttendanceData snapshot for each month
      await prisma.salaryAttendanceData.create({
        data: {
          companyId: company.id,
          userId: user.id,
          year: m.year,
          month: m.month,
          workDays,
          actualWorkDays,
          absentDays: workDays - actualWorkDays,
          lateDays,
          totalRegularMinutes: totalRegular,
          totalOvertimeMinutes: totalOvertime,
          confirmedAt: new Date(),
          confirmedBy: adminUser.id,
          version: 1,
        },
      });
    }

    console.log(`Attendance data created for ${m.year}-${String(m.month).padStart(2, '0')}`);
  }

  // ──────────────────────────────────────────────
  // Last month's salary calculations (for payroll history / employee home)
  // ──────────────────────────────────────────────
  const lastM = attendanceMonths[1];
  for (const emp of employees) {
    const basePay = emp.baseSalary;
    const positionAllowance = basePay >= 4500000 ? 500000 : basePay >= 3500000 ? 300000 : 150000;
    const meals = 200000;
    const vehicle = 200000;
    const totalNonTaxable = meals + vehicle;
    const totalPay = basePay + positionAllowance + meals + vehicle;
    const taxableIncome = totalPay - totalNonTaxable;

    // Simplified insurance/tax calculations
    const nationalPension = Math.floor(Math.min(Math.max(taxableIncome, 390000), 6170000) * 0.045 / 10) * 10;
    const healthInsurance = Math.floor(taxableIncome * 0.03545);
    const longTermCare = Math.floor(healthInsurance * 0.1295);
    const employmentInsurance = Math.floor(taxableIncome * 0.009);
    // Simplified income tax (rough bracket: ~5% for moderate incomes)
    const incomeTax = Math.floor(taxableIncome * 0.04);
    const localIncomeTax = Math.floor(incomeTax * 0.1);
    const totalDeduction = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax;
    const netPay = totalPay - totalDeduction;

    await prisma.salaryCalculation.create({
      data: {
        companyId: company.id,
        userId: emp.id,
        year: lastM.year,
        month: lastM.month,
        status: 'CONFIRMED',
        ordinaryWageMonthly: basePay + positionAllowance,
        ordinaryWageHourly: Math.floor((basePay + positionAllowance) / 209),
        basePay,
        fixedAllowances: positionAllowance + meals + vehicle,
        totalPay,
        totalNonTaxable,
        taxableIncome,
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance,
        incomeTax,
        localIncomeTax,
        totalDeduction,
        netPay,
        confirmedAt: new Date(lastM.year, lastM.month - 1, 26),
        confirmedBy: adminUser.id,
      },
    });

    // PayrollMonthly entry for history
    await prisma.payrollMonthly.create({
      data: {
        companyId: company.id,
        userId: emp.id,
        year: lastM.year,
        month: lastM.month,
        totalPay,
        taxableIncome,
        totalNonTaxable,
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance,
        incomeTax,
        localIncomeTax,
        netPay,
      },
    });
  }
  console.log('Last month salary calculations + payroll monthly created');

  // ──────────────────────────────────────────────
  // Leave Groups, Types, Accrual Rules (시프티 벤치마크 기반)
  // ──────────────────────────────────────────────
  const annualLeaveGroup = await prisma.leaveGroup.create({
    data: {
      companyId: company.id,
      name: '연차휴가',
      allowOveruse: false,
      description: '법정 연차 휴가 그룹',
      sortOrder: 1,
      isActive: true,
      isSystem: true,
    },
  });
  const otherLeaveGroup = await prisma.leaveGroup.create({
    data: {
      companyId: company.id,
      name: '기타휴가',
      allowOveruse: true,
      description: '경조사, 병가 등 기타 휴가 그룹',
      sortOrder: 2,
      isActive: true,
      isSystem: true,
    },
  });
  console.log('Leave groups created: 2');

  // 8 Leave Type Configs (시프티 벤치마크 기반)
  const leaveTypeConfigs = [
    { code: 'ABSENCE', name: '결근', groupId: null, timeOption: 'FULL_DAY' as const, paidHours: 0, deductionDays: 1, deductsFromBalance: false, sortOrder: 1 },
    { code: 'CONDOLENCE', name: '경조', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 0, deductsFromBalance: false, sortOrder: 2 },
    { code: 'PUBLIC', name: '공가', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 0, deductsFromBalance: false, sortOrder: 3 },
    { code: 'OTHER', name: '기타', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 1, deductsFromBalance: false, sortOrder: 4 },
    { code: 'SICK', name: '병가', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 1, deductsFromBalance: false, sortOrder: 5 },
    { code: 'SICK_PAID', name: '병가(유급)', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 0, deductsFromBalance: false, sortOrder: 6 },
    { code: 'HALF_DAY', name: '반차', groupId: annualLeaveGroup.id, timeOption: 'HALF_DAY' as const, paidHours: 4, deductionDays: 0.5, deductsFromBalance: true, sortOrder: 7 },
    { code: 'ANNUAL', name: '연차', groupId: annualLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 1, deductsFromBalance: true, sortOrder: 8 },
  ];

  const createdLeaveTypeConfigs: Record<string, string> = {};
  for (const ltc of leaveTypeConfigs) {
    const created = await prisma.leaveTypeConfig.create({
      data: {
        companyId: company.id,
        leaveGroupId: ltc.groupId,
        code: ltc.code,
        name: ltc.name,
        timeOption: ltc.timeOption,
        paidHours: ltc.paidHours,
        deductionDays: ltc.deductionDays,
        deductsFromBalance: ltc.deductsFromBalance,
        requiresApproval: true,
        sortOrder: ltc.sortOrder,
        isActive: true,
        isSystem: true,
      },
    });
    createdLeaveTypeConfigs[ltc.code] = created.id;
  }
  console.log('Leave type configs created:', leaveTypeConfigs.length);

  // Accrual Rule 1: 입사일 기준 연차 — 1년 미만자 (월 기준, 11개 tier)
  const monthlyRule = await prisma.leaveAccrualRule.create({
    data: {
      companyId: company.id,
      leaveGroupId: annualLeaveGroup.id,
      name: '입사일 기준 연차 — 1년 미만자',
      accrualBasis: 'JOIN_DATE',
      accrualUnit: 'MONTHLY',
      proRataFirstYear: false,
      description: '근로기준법 제60조 2항: 1년 미만 근로자 매월 1일 발생',
      isActive: true,
      sortOrder: 1,
    },
  });

  // 11 monthly tiers (1~11개월)
  const monthlyTiers = [];
  for (let m = 1; m <= 11; m++) {
    monthlyTiers.push({
      accrualRuleId: monthlyRule.id,
      serviceMonthFrom: m,
      serviceMonthTo: m,
      accrualDays: 1,
      validMonths: 12 - m,
      sortOrder: m,
    });
  }
  await prisma.leaveAccrualRuleTier.createMany({ data: monthlyTiers });
  console.log('Monthly accrual rule created with 11 tiers');

  // Accrual Rule 2: 회계연도 기준 연차 — 1년 이상자 (연 기준, 22개 tier)
  const yearlyRule = await prisma.leaveAccrualRule.create({
    data: {
      companyId: company.id,
      leaveGroupId: annualLeaveGroup.id,
      name: '회계연도 기준 연차 — 1년 이상자',
      accrualBasis: 'FISCAL_YEAR',
      accrualUnit: 'YEARLY',
      proRataFirstYear: true,
      description: '근로기준법 제60조: 기본 15일, 2년마다 1일 가산, 최대 25일',
      isActive: true,
      sortOrder: 2,
    },
  });

  // 22 yearly tiers (1~22년차 이상)
  const yearlyTiers = [];
  const yearRanges = [
    [12, 35, 15], [36, 59, 15],       // 1~2년: 15일, 3~4년: 15일 (실제로는 16이지만 시프티 기준에 맞춤)
    [12, 35, 15], // 재정의 — 아래 정확한 로직 적용
  ];
  // 정확한 시프티 벤치마크 tiers:
  // 1~3년차(12~47개월): 15일
  // 4~5년차(48~71개월): 16일
  // 6~7년차(72~95개월): 17일
  // ...2년마다 +1, 최대 25일
  const preciseYearlyTiers = [
    { from: 12, to: 47, days: 15 },    // 1~3년차
    { from: 48, to: 71, days: 16 },    // 4~5년차
    { from: 72, to: 95, days: 17 },    // 6~7년차
    { from: 96, to: 119, days: 18 },   // 8~9년차
    { from: 120, to: 143, days: 19 },  // 10~11년차
    { from: 144, to: 167, days: 20 },  // 12~13년차
    { from: 168, to: 191, days: 21 },  // 14~15년차
    { from: 192, to: 215, days: 22 },  // 16~17년차
    { from: 216, to: 239, days: 23 },  // 18~19년차
    { from: 240, to: 263, days: 24 },  // 20~21년차
    { from: 264, to: 999, days: 25 },  // 22년차 이상 (최대 25일)
  ];
  for (let i = 0; i < preciseYearlyTiers.length; i++) {
    const t = preciseYearlyTiers[i];
    yearlyTiers.push({
      accrualRuleId: yearlyRule.id,
      serviceMonthFrom: t.from,
      serviceMonthTo: t.to,
      accrualDays: t.days,
      validMonths: null,
      sortOrder: i + 1,
    });
  }
  await prisma.leaveAccrualRuleTier.createMany({ data: yearlyTiers });
  console.log('Yearly accrual rule created with', preciseYearlyTiers.length, 'tiers');

  // ──────────────────────────────────────────────
  // Sample leave balances (2025/2026)
  // ──────────────────────────────────────────────
  const currentYear = today.getFullYear();
  for (const emp of employees) {
    const totalDays = 15; // Default annual leave
    const usedDays = Math.floor(Math.random() * 8);
    await prisma.leaveBalance.create({
      data: {
        companyId: company.id,
        userId: emp.id,
        year: currentYear,
        totalDays,
        usedDays,
        remainingDays: totalDays - usedDays,
      },
    });
  }
  console.log('Leave balances created');

  // ──────────────────────────────────────────────
  // Sample notifications
  // ──────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        companyId: company.id,
        userId: adminUser.id,
        type: 'PAYROLL_CONFIRMED',
        priority: 'HIGH',
        title: `${lastM.year}년 ${lastM.month}월 급여가 확정되었습니다`,
        message: '총 50명의 급여가 확정 처리되었습니다.',
        link: '/payroll/history',
      },
      {
        companyId: company.id,
        userId: employees[0].id,
        type: 'PAYROLL_CONFIRMED',
        priority: 'MEDIUM',
        title: `${lastM.year}년 ${lastM.month}월 급여명세서가 등록되었습니다`,
        message: '급여 탭에서 상세 내역을 확인하세요.',
        link: '/salary',
      },
      {
        companyId: company.id,
        userId: adminUser.id,
        type: 'OVERTIME_WARNING',
        priority: 'HIGH',
        title: '52시간 초과 경고',
        message: '정민호 사원의 주간 근로시간이 48시간을 초과했습니다.',
        link: '/attendance/overtime',
      },
    ],
  });
  console.log('Notifications created');

  // ──────────────────────────────────────────────
  // Sample Tax Brackets (simplified, 2025)
  // ──────────────────────────────────────────────
  const taxBrackets = [
    // dependents=1 brackets (simplified)
    { year: 2025, minIncome: 0, maxIncome: 1060000, dependents: 1, taxAmount: 0 },
    { year: 2025, minIncome: 1060000, maxIncome: 1500000, dependents: 1, taxAmount: 19000 },
    { year: 2025, minIncome: 1500000, maxIncome: 2000000, dependents: 1, taxAmount: 46000 },
    { year: 2025, minIncome: 2000000, maxIncome: 2500000, dependents: 1, taxAmount: 79000 },
    { year: 2025, minIncome: 2500000, maxIncome: 3000000, dependents: 1, taxAmount: 115000 },
    { year: 2025, minIncome: 3000000, maxIncome: 3500000, dependents: 1, taxAmount: 153000 },
    { year: 2025, minIncome: 3500000, maxIncome: 4000000, dependents: 1, taxAmount: 196000 },
    { year: 2025, minIncome: 4000000, maxIncome: 4500000, dependents: 1, taxAmount: 248000 },
    { year: 2025, minIncome: 4500000, maxIncome: 5000000, dependents: 1, taxAmount: 307000 },
    { year: 2025, minIncome: 5000000, maxIncome: 6000000, dependents: 1, taxAmount: 396000 },
    { year: 2025, minIncome: 6000000, maxIncome: 7000000, dependents: 1, taxAmount: 525000 },
    { year: 2025, minIncome: 7000000, maxIncome: 8000000, dependents: 1, taxAmount: 670000 },
    { year: 2025, minIncome: 8000000, maxIncome: 10000000, dependents: 1, taxAmount: 884000 },
    { year: 2025, minIncome: 10000000, maxIncome: 99999999, dependents: 1, taxAmount: 1397000 },
    // dependents=2 brackets (lower amounts)
    { year: 2025, minIncome: 0, maxIncome: 1060000, dependents: 2, taxAmount: 0 },
    { year: 2025, minIncome: 1060000, maxIncome: 1500000, dependents: 2, taxAmount: 9000 },
    { year: 2025, minIncome: 1500000, maxIncome: 2000000, dependents: 2, taxAmount: 32000 },
    { year: 2025, minIncome: 2000000, maxIncome: 2500000, dependents: 2, taxAmount: 57000 },
    { year: 2025, minIncome: 2500000, maxIncome: 3000000, dependents: 2, taxAmount: 88000 },
    { year: 2025, minIncome: 3000000, maxIncome: 3500000, dependents: 2, taxAmount: 120000 },
    { year: 2025, minIncome: 3500000, maxIncome: 4000000, dependents: 2, taxAmount: 157000 },
    { year: 2025, minIncome: 4000000, maxIncome: 4500000, dependents: 2, taxAmount: 202000 },
    { year: 2025, minIncome: 4500000, maxIncome: 5000000, dependents: 2, taxAmount: 254000 },
    { year: 2025, minIncome: 5000000, maxIncome: 6000000, dependents: 2, taxAmount: 330000 },
    { year: 2025, minIncome: 6000000, maxIncome: 7000000, dependents: 2, taxAmount: 445000 },
    { year: 2025, minIncome: 7000000, maxIncome: 8000000, dependents: 2, taxAmount: 577000 },
    { year: 2025, minIncome: 8000000, maxIncome: 10000000, dependents: 2, taxAmount: 768000 },
    { year: 2025, minIncome: 10000000, maxIncome: 99999999, dependents: 2, taxAmount: 1216000 },
    // dependents=3 brackets
    { year: 2025, minIncome: 0, maxIncome: 1060000, dependents: 3, taxAmount: 0 },
    { year: 2025, minIncome: 1060000, maxIncome: 2000000, dependents: 3, taxAmount: 12000 },
    { year: 2025, minIncome: 2000000, maxIncome: 2500000, dependents: 3, taxAmount: 36000 },
    { year: 2025, minIncome: 2500000, maxIncome: 3000000, dependents: 3, taxAmount: 62000 },
    { year: 2025, minIncome: 3000000, maxIncome: 3500000, dependents: 3, taxAmount: 89000 },
    { year: 2025, minIncome: 3500000, maxIncome: 4000000, dependents: 3, taxAmount: 120000 },
    { year: 2025, minIncome: 4000000, maxIncome: 4500000, dependents: 3, taxAmount: 158000 },
    { year: 2025, minIncome: 4500000, maxIncome: 5000000, dependents: 3, taxAmount: 202000 },
    { year: 2025, minIncome: 5000000, maxIncome: 6000000, dependents: 3, taxAmount: 269000 },
    { year: 2025, minIncome: 6000000, maxIncome: 7000000, dependents: 3, taxAmount: 371000 },
    { year: 2025, minIncome: 7000000, maxIncome: 8000000, dependents: 3, taxAmount: 490000 },
    { year: 2025, minIncome: 8000000, maxIncome: 10000000, dependents: 3, taxAmount: 659000 },
    { year: 2025, minIncome: 10000000, maxIncome: 99999999, dependents: 3, taxAmount: 1050000 },
  ];

  for (const tb of taxBrackets) {
    await prisma.taxBracket.create({ data: tb });
  }
  console.log('Tax brackets created:', taxBrackets.length);

  // ──────────────────────────────────────────────
  // System Admin company + user (sysadmin123!)
  // ──────────────────────────────────────────────
  const systemCompany = await prisma.company.create({
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
  const sysadminPassword = await bcrypt.hash('sysadmin123!', 10);
  await prisma.user.create({
    data: {
      companyId: systemCompany.id,
      email: 'sysadmin@insa365.com',
      password: sysadminPassword,
      name: '시스템관리자',
      role: 'SYSTEM_ADMIN',
      employeeNumber: 'SYS001',
      employeeStatus: 'ACTIVE',
      canViewSensitive: true,
      joinDate: new Date('2024-01-01'),
    },
  });
  console.log('System admin user created: sysadmin@insa365.com / sysadmin123!');

  // ──────────────────────────────────────────────
  // Manager user (password: manager123!)
  // ──────────────────────────────────────────────
  const managerPassword = await bcrypt.hash('manager123!', 10);
  await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'manager@test-company.com',
      password: managerPassword,
      name: '팀장',
      role: 'MANAGER',
      employeeNumber: 'EA0017',
      employeeStatus: 'ACTIVE',
      departmentId: departments[1].id,
      positionId: positions[2].id,
      joinDate: new Date('2022-06-01'),
      dependents: 2,
      workPolicyId: workPolicy.id,
      workLocationId: workLocation.id,
    },
  });
  console.log('Manager user created');

  console.log('');
  console.log('=== Seed Complete ===');
  // ─── Subscription (Trial) ────────────────────────────
  const existingSub = await prisma.subscription.findUnique({ where: { companyId: company.id } });
  if (!existingSub) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await prisma.subscription.create({
      data: {
        companyId: company.id,
        plan: 'TRIAL',
        status: 'TRIAL_ACTIVE',
        trialEndsAt: trialEnd,
        maxEmployees: 5,
        pricePerEmployee: 0,
      },
    });
    console.log('Subscription (TRIAL) seeded');
  } else {
    console.log('Subscription already exists:', existingSub.plan);
  }

  console.log('Company:', company.name);
  console.log('Admin login: admin@test-company.com / admin123! (COMPANY_ADMIN)');
  console.log('System Admin login: sysadmin@insa365.com / sysadmin123! (SYSTEM_ADMIN)');
  console.log('Manager login: manager@test-company.com / manager123!');
  console.log('Employee login: kim.ys@test-company.com / test1234! (and 14 others)');
  console.log('Total employees:', employees.length + 2, `(${employees.length} employees + 1 admin + 1 manager)`);
}

async function seedLeaveData(companyId: string) {
  // 이미 휴가 그룹이 있으면 스킵
  const existingGroups = await prisma.leaveGroup.findMany({ where: { companyId } });
  if (existingGroups.length > 0) {
    console.log('Leave data already exists, skipping.');
    return;
  }

  const annualLeaveGroup = await prisma.leaveGroup.create({
    data: {
      companyId,
      name: '연차휴가',
      allowOveruse: false,
      description: '법정 연차 휴가 그룹',
      sortOrder: 1,
      isActive: true,
      isSystem: true,
    },
  });
  const otherLeaveGroup = await prisma.leaveGroup.create({
    data: {
      companyId,
      name: '기타휴가',
      allowOveruse: true,
      description: '경조사, 병가 등 기타 휴가 그룹',
      sortOrder: 2,
      isActive: true,
      isSystem: true,
    },
  });
  console.log('Leave groups created: 2');

  const leaveTypeConfigs = [
    { code: 'ABSENCE', name: '결근', groupId: null, timeOption: 'FULL_DAY' as const, paidHours: 0, deductionDays: 1, deductsFromBalance: false, sortOrder: 1 },
    { code: 'CONDOLENCE', name: '경조', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 0, deductsFromBalance: false, sortOrder: 2 },
    { code: 'PUBLIC', name: '공가', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 0, deductsFromBalance: false, sortOrder: 3 },
    { code: 'OTHER', name: '기타', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 1, deductsFromBalance: false, sortOrder: 4 },
    { code: 'SICK', name: '병가', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 1, deductsFromBalance: false, sortOrder: 5 },
    { code: 'SICK_PAID', name: '병가(유급)', groupId: otherLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 0, deductsFromBalance: false, sortOrder: 6 },
    { code: 'HALF_DAY', name: '반차', groupId: annualLeaveGroup.id, timeOption: 'HALF_DAY' as const, paidHours: 4, deductionDays: 0.5, deductsFromBalance: true, sortOrder: 7 },
    { code: 'ANNUAL', name: '연차', groupId: annualLeaveGroup.id, timeOption: 'FULL_DAY' as const, paidHours: 8, deductionDays: 1, deductsFromBalance: true, sortOrder: 8 },
  ];

  for (const ltc of leaveTypeConfigs) {
    await prisma.leaveTypeConfig.create({
      data: {
        companyId,
        leaveGroupId: ltc.groupId,
        code: ltc.code,
        name: ltc.name,
        timeOption: ltc.timeOption,
        paidHours: ltc.paidHours,
        deductionDays: ltc.deductionDays,
        deductsFromBalance: ltc.deductsFromBalance,
        requiresApproval: true,
        sortOrder: ltc.sortOrder,
        isActive: true,
        isSystem: true,
      },
    });
  }
  console.log('Leave type configs created:', leaveTypeConfigs.length);

  // Accrual Rule 1: 월별 (1년 미만)
  const monthlyRule = await prisma.leaveAccrualRule.create({
    data: {
      companyId,
      leaveGroupId: annualLeaveGroup.id,
      name: '입사일 기준 연차 — 1년 미만자',
      accrualBasis: 'JOIN_DATE',
      accrualUnit: 'MONTHLY',
      proRataFirstYear: false,
      description: '근로기준법 제60조 2항: 1년 미만 근로자 매월 1일 발생',
      isActive: true,
      sortOrder: 1,
    },
  });
  const monthlyTiers = [];
  for (let m = 1; m <= 11; m++) {
    monthlyTiers.push({
      accrualRuleId: monthlyRule.id,
      serviceMonthFrom: m,
      serviceMonthTo: m,
      accrualDays: 1,
      validMonths: 12 - m,
      sortOrder: m,
    });
  }
  await prisma.leaveAccrualRuleTier.createMany({ data: monthlyTiers });
  console.log('Monthly accrual rule created with 11 tiers');

  // Accrual Rule 2: 연간 (1년 이상)
  const yearlyRule = await prisma.leaveAccrualRule.create({
    data: {
      companyId,
      leaveGroupId: annualLeaveGroup.id,
      name: '회계연도 기준 연차 — 1년 이상자',
      accrualBasis: 'FISCAL_YEAR',
      accrualUnit: 'YEARLY',
      proRataFirstYear: true,
      description: '근로기준법 제60조: 기본 15일, 2년마다 1일 가산, 최대 25일',
      isActive: true,
      sortOrder: 2,
    },
  });
  const preciseYearlyTiers = [
    { from: 12, to: 47, days: 15 },
    { from: 48, to: 71, days: 16 },
    { from: 72, to: 95, days: 17 },
    { from: 96, to: 119, days: 18 },
    { from: 120, to: 143, days: 19 },
    { from: 144, to: 167, days: 20 },
    { from: 168, to: 191, days: 21 },
    { from: 192, to: 215, days: 22 },
    { from: 216, to: 239, days: 23 },
    { from: 240, to: 263, days: 24 },
    { from: 264, to: 999, days: 25 },
  ];
  const yearlyTiers = preciseYearlyTiers.map((t, i) => ({
    accrualRuleId: yearlyRule.id,
    serviceMonthFrom: t.from,
    serviceMonthTo: t.to,
    accrualDays: t.days,
    validMonths: null,
    sortOrder: i + 1,
  }));
  await prisma.leaveAccrualRuleTier.createMany({ data: yearlyTiers });
  console.log('Yearly accrual rule created with', preciseYearlyTiers.length, 'tiers');
  console.log('Leave data seeded successfully.');

  // ─── System Announcements ────────────────────────────
  const existingAnnouncements = await prisma.announcement.count({ where: { companyId: null } });
  if (existingAnnouncements === 0) {
    await prisma.announcement.createMany({
      data: [
        { companyId: null, category: 'NEW_FEATURE', title: 'v2.0 출시: 클린 아키텍처 전환 완료', content: '전체 API가 DI 컨테이너를 통한 의존성 주입 패턴으로 전환되었습니다.', isNew: true },
        { companyId: null, category: 'NOTICE', title: '2026년 4대보험 요율 반영 완료', content: '국민연금, 건강보험, 장기요양보험, 고용보험 요율이 2026년 기준으로 업데이트되었습니다.', isNew: true },
        { companyId: null, category: 'NEWS', title: '시프티 벤치마크 기반 UI 개선', content: '출퇴근 달력, 휴가 관리, 대시보드 위젯이 업그레이드되었습니다.', isNew: false },
        { companyId: null, category: 'UPDATE', title: '52시간 경고 기능 강화', content: '주 48시간 초과 시 관리자에게 실시간 알림이 발송됩니다.', isNew: false },
        { companyId: null, category: 'NOTICE', title: '개인정보보호법 컴플라이언스 안내', content: 'PII 암호화, 접근 로그 기록 등 법적 요구사항을 충족합니다.', isNew: false },
      ],
    });
    console.log('System announcements seeded (5 items)');
  } else {
    console.log('System announcements already exist:', existingAnnouncements);
  }
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
