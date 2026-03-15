/**
 * 테스트주식회사(123-45-67890) 데이터 완전 삭제 스크립트
 *
 * 용도: 시드 데이터가 현재 로직과 맞지 않을 때 회사 데이터를 깨끗이 삭제 후
 *       `npx prisma db seed`로 재생성하기 위한 1회용 스크립트.
 *
 * 주의:
 * - Global 테이블(InsuranceRate, TaxBracket 등)은 삭제하지 않음
 * - 시스템 회사(000-00-00000)는 건드리지 않음
 * - soft-delete 포함 전부 hard delete
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
      console.log(`회사(${TARGET_BUSINESS_NUMBER})가 존재하지 않습니다. 삭제할 것이 없습니다.`);
      return;
    }

    const companyId = company.id;
    console.log(`대상 회사: ${company.name} (${companyId})`);

    // 2. 소속 유저 ID 목록
    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    console.log(`소속 직원 수: ${userIds.length}`);

    // 3. 소속 Attendance ID 목록 (AttendanceSegment 삭제용)
    const attendances = await prisma.attendance.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const attendanceIds = attendances.map((a) => a.id);

    // 4. 소속 Subscription ID (Payment 삭제용)
    const subscription = await prisma.subscription.findFirst({
      where: { companyId },
      select: { id: true },
    });

    // 5. 소속 LeaveAccrualRule ID (LeaveAccrualRuleTier 삭제용)
    const leaveAccrualRules = await prisma.leaveAccrualRule.findMany({
      where: { companyId },
      select: { id: true },
    });
    const leaveAccrualRuleIds = leaveAccrualRules.map((r) => r.id);

    // 6. FK 안전 순서대로 삭제 ($transaction)
    const result = await prisma.$transaction(async (tx) => {
      const counts: Record<string, number> = {};

      // --- userId FK 기반 ---
      counts.termsAgreement = (await tx.termsAgreement.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.employeeInvitation = (await tx.employeeInvitation.deleteMany({ where: { companyId } })).count;
      counts.leaveAccrualRecord = (await tx.leaveAccrualRecord.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.leaveRequest = (await tx.leaveRequest.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.leaveBalance = (await tx.leaveBalance.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.notification = (await tx.notification.deleteMany({ where: { companyId } })).count;
      counts.auditLog = (await tx.auditLog.deleteMany({ where: { companyId } })).count;
      counts.payrollMonthly = (await tx.payrollMonthly.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.salaryCalculation = (await tx.salaryCalculation.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.salaryAttendanceData = (await tx.salaryAttendanceData.deleteMany({ where: { userId: { in: userIds } } })).count;

      // --- attendanceId FK ---
      counts.attendanceSegment = (await tx.attendanceSegment.deleteMany({ where: { attendanceId: { in: attendanceIds } } })).count;
      counts.attendance = (await tx.attendance.deleteMany({ where: { userId: { in: userIds } } })).count;

      // --- userId FK ---
      counts.employeeSalaryItem = (await tx.employeeSalaryItem.deleteMany({ where: { userId: { in: userIds } } })).count;
      counts.user = (await tx.user.deleteMany({ where: { companyId } })).count;

      // --- companyId FK (참조 테이블) ---
      counts.leaveAccrualRuleTier = (await tx.leaveAccrualRuleTier.deleteMany({ where: { accrualRuleId: { in: leaveAccrualRuleIds } } })).count;
      counts.leaveAccrualRule = (await tx.leaveAccrualRule.deleteMany({ where: { companyId } })).count;
      counts.leaveTypeConfig = (await tx.leaveTypeConfig.deleteMany({ where: { companyId } })).count;
      counts.leaveGroup = (await tx.leaveGroup.deleteMany({ where: { companyId } })).count;
      counts.salaryRule = (await tx.salaryRule.deleteMany({ where: { companyId } })).count;
      counts.workLocation = (await tx.workLocation.deleteMany({ where: { companyId } })).count;
      counts.workPolicy = (await tx.workPolicy.deleteMany({ where: { companyId } })).count;
      counts.position = (await tx.position.deleteMany({ where: { companyId } })).count;
      counts.department = (await tx.department.deleteMany({ where: { companyId } })).count;

      // --- Subscription / Payment ---
      if (subscription) {
        counts.payment = (await tx.payment.deleteMany({ where: { subscriptionId: subscription.id } })).count;
        counts.subscription = (await tx.subscription.deleteMany({ where: { companyId } })).count;
      }

      // --- 마지막: Company ---
      counts.company = (await tx.company.deleteMany({ where: { id: companyId } })).count;

      return counts;
    });

    // 7. 결과 출력
    console.log('\n=== 삭제 완료 ===');
    for (const [model, count] of Object.entries(result)) {
      if (count > 0) {
        console.log(`  ${model}: ${count}건 삭제`);
      }
    }
    console.log('\n다음 단계: npx prisma db seed');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('삭제 실패:', e);
  process.exit(1);
});
