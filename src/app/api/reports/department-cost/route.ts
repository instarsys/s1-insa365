import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const departments = await prisma.department.findMany({
    where: { companyId: auth.companyId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' },
  });

  const calculations = await prisma.salaryCalculation.findMany({
    where: {
      companyId: auth.companyId,
      year,
      month,
      deletedAt: null,
      status: { in: ['CONFIRMED', 'PAID'] },
    },
    include: {
      user: { select: { departmentId: true } },
    },
  });

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
