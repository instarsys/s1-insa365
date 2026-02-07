import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month, departmentId } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const employees = await prisma.user.findMany({
    where: {
      companyId: auth.companyId,
      deletedAt: null,
      employeeStatus: 'ACTIVE',
      ...(departmentId && { departmentId }),
    },
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      department: { select: { name: true } },
      position: { select: { name: true } },
      attendances: {
        where: {
          date: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        select: {
          date: true,
          status: true,
          checkInTime: true,
          checkOutTime: true,
          regularMinutes: true,
          overtimeMinutes: true,
          nightMinutes: true,
          totalMinutes: true,
          isConfirmed: true,
        },
        orderBy: { date: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const summary = employees.map((emp) => {
    const atts = emp.attendances;
    return {
      ...emp,
      summary: {
        workDays: atts.filter((a) => a.checkInTime).length,
        totalRegularMinutes: atts.reduce((s, a) => s + a.regularMinutes, 0),
        totalOvertimeMinutes: atts.reduce((s, a) => s + a.overtimeMinutes, 0),
        totalNightMinutes: atts.reduce((s, a) => s + a.nightMinutes, 0),
        totalMinutes: atts.reduce((s, a) => s + a.totalMinutes, 0),
        confirmed: atts.every((a) => a.isConfirmed),
      },
    };
  });

  return successResponse({ year, month, items: summary });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
