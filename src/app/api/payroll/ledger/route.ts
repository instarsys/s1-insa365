import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);
  const payrollGroupId = url.searchParams.get('payrollGroupId') || undefined;

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { payrollMonthlyRepo } = getContainer();

  // PayrollMonthly 스냅샷에서 읽기 (불변 데이터)
  const records = await payrollMonthlyRepo.findByPeriodAndGroup(auth.companyId, year, month, payrollGroupId);

  const employees = records.map((r) => ({
    employeeNumber: r.employeeNumber ?? '',
    employeeName: r.employeeName ?? '',
    departmentName: r.departmentName ?? '',
    payItems: r.payItemsSnapshot ?? [],
    deductionItems: r.deductionItemsSnapshot ?? [],
    attendance: r.attendanceSnapshot ?? null,
    metadata: r.snapshotMetadata ?? null,
    totalPay: Number(r.totalPay),
    totalDeduction: Number(r.nationalPension) + Number(r.healthInsurance) + Number(r.longTermCare) +
      Number(r.employmentInsurance) + Number(r.incomeTax) + Number(r.localIncomeTax),
    netPay: Number(r.netPay),
  }));

  return successResponse({
    year,
    month,
    employeeCount: records.length,
    employees,
  });
}

export const GET = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
