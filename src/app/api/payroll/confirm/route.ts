import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';

import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { confirmPayrollSchema } from '@/presentation/api/schemas';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(confirmPayrollSchema, body);
    if (!validation.success) return validation.response;
    const { year, month, payrollGroupId } = validation.data;

    const { salaryCalcRepo, salaryAttendanceRepo, employeeRepo, payrollMonthlyRepo, notificationRepo, auditLogRepo, leaveRequestRepo } = getContainer();

    // 활성 직원 중 근태 미확정 확인 (payrollGroupId가 있으면 해당 그룹만)
    const activeEmployees = await employeeRepo.findAll(auth.companyId, {
      status: 'ACTIVE',
      page: 1,
      limit: 10000,
      ...(payrollGroupId && { payrollGroupId }),
    });
    const targetUserIds = activeEmployees.items.map((e) => e.id);

    const attendanceData = await salaryAttendanceRepo.findByPeriod(auth.companyId, year, month);
    const confirmedUserIds = new Set(attendanceData.map((a) => a.userId));
    const unconfirmedEmployees = activeEmployees.items.filter((e) => !confirmedUserIds.has(e.id));

    if (unconfirmedEmployees.length > 0) {
      return errorResponse(
        `근태 미확정 직원 ${unconfirmedEmployees.length}명이 있습니다. 근태를 먼저 확정해주세요.`,
        400,
      );
    }

    // 미처리 휴가 확인
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));
    const pendingLeaves = await leaveRequestRepo.findPendingByPeriod(
      auth.companyId, startDate, endDate,
    );
    if (pendingLeaves.length > 0) {
      return errorResponse(
        `미처리 휴가 ${pendingLeaves.length}건이 있습니다. 휴가 관리에서 먼저 승인/거절해주세요.`,
        400,
      );
    }

    const drafts = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);
    // payrollGroupId가 있으면 해당 그룹 직원의 DRAFT만 필터
    const draftItems = payrollGroupId
      ? drafts.filter((d) => d.status === 'DRAFT' && targetUserIds.includes(d.userId))
      : drafts.filter((d) => d.status === 'DRAFT');

    if (draftItems.length === 0) {
      return errorResponse('확정할 급여 계산이 없습니다.', 400);
    }

    // payrollGroupId가 있으면 해당 직원만 상태 변경, 없으면 전체
    if (payrollGroupId && targetUserIds.length > 0) {
      await salaryCalcRepo.updateStatusByUserIds(auth.companyId, year, month, targetUserIds, 'CONFIRMED', auth.userId);
    } else {
      await salaryCalcRepo.updateStatus(auth.companyId, year, month, 'CONFIRMED', auth.userId);
    }

    // Create PayrollMonthly records
    for (const calc of draftItems) {
      await payrollMonthlyRepo.upsert(auth.companyId, calc.userId, year, month, {
        companyId: auth.companyId,
        userId: calc.userId,
        year,
        month,
        totalPay: calc.totalPay,
        taxableIncome: calc.taxableIncome,
        totalNonTaxable: calc.totalNonTaxable,
        nationalPension: calc.nationalPension,
        healthInsurance: calc.healthInsurance,
        longTermCare: calc.longTermCare,
        employmentInsurance: calc.employmentInsurance,
        incomeTax: calc.incomeTax,
        localIncomeTax: calc.localIncomeTax,
        netPay: calc.netPay,
      });

      // Notify employee
      await notificationRepo.create({
        companyId: auth.companyId,
        userId: calc.userId,
        type: 'PAYROLL_CONFIRMED',
        priority: 'HIGH',
        title: `${year}년 ${month}월 급여 확정`,
        message: '급여가 확정되었습니다. 급여명세서를 확인해주세요.',
        link: '/e/payroll',
      });
    }

    await auditLogRepo.create({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CONFIRM',
      entityType: 'SalaryCalculation',
      after: { year, month, confirmedCount: draftItems.length } as Record<string, unknown>,
    });

    return successResponse({ confirmedCount: draftItems.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : '급여 확정 중 오류가 발생했습니다.';
    return errorResponse(message, 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
