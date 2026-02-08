import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
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

    const drafts = await prisma.salaryCalculation.findMany({
      where: {
        companyId: auth.companyId,
        year,
        month,
        status: 'DRAFT',
        deletedAt: null,
      },
    });

    if (drafts.length === 0) {
      return errorResponse('확정할 급여 계산이 없습니다.', 400);
    }

    const now = new Date();

    await prisma.salaryCalculation.updateMany({
      where: {
        companyId: auth.companyId,
        year,
        month,
        status: 'DRAFT',
        deletedAt: null,
      },
      data: {
        status: 'CONFIRMED',
        confirmedAt: now,
        confirmedBy: auth.userId,
      },
    });

    // Create PayrollMonthly records
    for (const calc of drafts) {
      await prisma.payrollMonthly.upsert({
        where: {
          companyId_userId_year_month: {
            companyId: auth.companyId,
            userId: calc.userId,
            year,
            month,
          },
        },
        update: {
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
        },
        create: {
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
        },
      });

      // Notify employee
      await prisma.notification.create({
        data: {
          companyId: auth.companyId,
          userId: calc.userId,
          type: 'PAYROLL_CONFIRMED',
          priority: 'HIGH',
          title: `${year}년 ${month}월 급여 확정`,
          message: '급여가 확정되었습니다. 급여명세서를 확인해주세요.',
          link: '/e/payroll',
        },
      });
    }

    await auditLogService.log({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CONFIRM',
      entityType: 'SalaryCalculation',
      after: { year, month, confirmedCount: drafts.length } as Record<string, unknown>,
    });

    return successResponse({ confirmedCount: drafts.length });
  } catch {
    return errorResponse('급여 확정 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
