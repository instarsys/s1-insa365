/**
 * 테스트주식회사(123-45-67890) 운영 데이터 초기화 스크립트
 *
 * 삭제 대상: 근태, 휴가, 급여, 알림, 감사로그
 * 유지 대상: 회사, 직원, 부서, 직급, 근로정책, 급여규칙, 휴가설정 등
 *
 * 실행: npx tsx scripts/clear-operational-data.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const TARGET_BUSINESS_NUMBER = '123-45-67890';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. 대상 회사 찾기
    const company = await prisma.company.findFirst({
      where: { businessNumber: TARGET_BUSINESS_NUMBER },
    });

    if (!company) {
      console.log(`회사(${TARGET_BUSINESS_NUMBER})가 존재하지 않습니다.`);
      return;
    }

    const companyId = company.id;
    console.log(`대상 회사: ${company.name} (${companyId})`);

    // 2. 소속 유저 ID 목록
    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true },
    });
    const userIds = users.map((u) => u.id);
    console.log(`소속 직원: ${users.map((u) => u.name).join(', ')} (${userIds.length}명)`);

    // 3. Attendance ID 목록 (AttendanceSegment 삭제용)
    const attendances = await prisma.attendance.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const attendanceIds = attendances.map((a) => a.id);

    // 4. FK 안전 순서대로 삭제 ($transaction)
    const result = await prisma.$transaction(async (tx) => {
      const counts: Record<string, number> = {};

      // --- 휴가 ---
      counts.leaveAccrualRecord = (await tx.leaveAccrualRecord.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.leaveRequest = (await tx.leaveRequest.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.leaveBalance = (await tx.leaveBalance.deleteMany({ where: { userId: { in: userIds } } })).count;

      // --- 알림 / 감사로그 ---
      counts.notification = (await tx.notification.deleteMany({ where: { companyId } })).count;
      counts.auditLog = (await tx.auditLog.deleteMany({ where: { companyId } })).count;

      // --- 급여 ---
      counts.payrollMonthly = (await tx.payrollMonthly.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.salaryCalculation = (await tx.salaryCalculation.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.salaryAttendanceData = (await tx.salaryAttendanceData.deleteMany({ where: { userId: { in: userIds } } })).count;

      // --- 근태 ---
      counts.attendanceSegment = (await tx.attendanceSegment.deleteMany({ where: { attendanceId: { in: attendanceIds } } })).count;
      counts.attendance = (await tx.attendance.deleteMany({ where: { userId: { in: userIds } } })).count;

      return counts;
    });

    // 5. 결과 출력
    console.log('\n=== 삭제 완료 ===');
    let totalDeleted = 0;
    for (const [model, count] of Object.entries(result)) {
      console.log(`  ${model}: ${count}건`);
      totalDeleted += count;
    }
    console.log(`\n총 ${totalDeleted}건 삭제. 직원·설정 데이터는 유지됨.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('삭제 실패:', e);
  process.exit(1);
});
