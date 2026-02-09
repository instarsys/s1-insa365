import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { departmentRepo, salaryCalcRepo } = getContainer();

  const [departments, calculations] = await Promise.all([
    departmentRepo.findAll(auth.companyId),
    salaryCalcRepo.findConfirmedWithDepartment(auth.companyId, year, month),
  ]);

  const departmentCosts = departments.map((dept) => {
    const deptCalcs = calculations.filter((c) => c.user.departmentId === dept.id);
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      employeeCount: deptCalcs.length,
      totalPay: deptCalcs.reduce((s, c) => s + Number(c.totalPay), 0),
      totalDeduction: deptCalcs.reduce((s, c) => s + Number(c.totalDeduction), 0),
      totalNetPay: deptCalcs.reduce((s, c) => s + Number(c.netPay), 0),
    };
  });

  return successResponse({ year, month, departments: departmentCosts });
}

export const GET = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
