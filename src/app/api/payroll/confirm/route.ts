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
    const { year, month } = validation.data;

    const { salaryCalcRepo, payrollMonthlyRepo, notificationRepo, auditLogRepo } = getContainer();

    const drafts = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);
    const draftItems = drafts.filter((d) => d.status === 'DRAFT');

    if (draftItems.length === 0) {
      return errorResponse('확정할 급여 계산이 없습니다.', 400);
    }

    await salaryCalcRepo.updateStatus(auth.companyId, year, month, 'CONFIRMED', auth.userId);

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
  } catch {
    return errorResponse('급여 확정 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
