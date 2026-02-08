import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const startYear = parseInt(url.searchParams.get('startYear') ?? '', 10);
  const startMonth = parseInt(url.searchParams.get('startMonth') ?? '', 10);
  const endYear = parseInt(url.searchParams.get('endYear') ?? '', 10);
  const endMonth = parseInt(url.searchParams.get('endMonth') ?? '', 10);

  if ([startYear, startMonth, endYear, endMonth].some(isNaN)) {
    return errorResponse('시작/종료 연월을 지정해주세요.', 400);
  }

  const startDate = new Date(startYear, startMonth - 1, 1);
  const endDate = new Date(endYear, endMonth, 0);

  const departments = await prisma.department.findMany({
    where: { companyId: auth.companyId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' },
  });

  const attendances = await prisma.attendance.findMany({
    where: {
      companyId: auth.companyId,
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      status: true,
      regularMinutes: true,
      overtimeMinutes: true,
      totalMinutes: true,
      user: { select: { departmentId: true } },
    },
  });

  const employeeCounts = await prisma.user.groupBy({
    by: ['departmentId'],
    where: {
      companyId: auth.companyId,
      deletedAt: null,
      employeeStatus: 'ACTIVE',
    },
    _count: true,
  });
  const countMap = new Map(employeeCounts.map((e) => [e.departmentId, e._count]));

  const items = departments.map((dept) => {
    const deptAttendances = attendances.filter((a) => a.user.departmentId === dept.id);
    const count = deptAttendances.length || 1;
    const totalEmployees = countMap.get(dept.id) ?? 0;
    const avgWorkingHours = Math.round((deptAttendances.reduce((s, a) => s + a.regularMinutes, 0) / count / 60) * 10) / 10;
    const avgOvertimeHours = Math.round((deptAttendances.reduce((s, a) => s + a.overtimeMinutes, 0) / count / 60) * 10) / 10;
    const absentCount = deptAttendances.filter((a) => a.status === 'ABSENT').length;
    const absenceRate = count > 0 ? Math.round((absentCount / count) * 100 * 10) / 10 : 0;
    const lateCount = deptAttendances.filter((a) => a.status === 'LATE' || a.status === 'EARLY_LEAVE').length;

    return {
      departmentName: dept.name,
      totalEmployees,
      avgWorkingHours,
      avgOvertimeHours,
      absenceRate,
      lateCount,
    };
  });

  return successResponse({ items });
}

export const GET = withRole('MANAGER', handler) as (request: NextRequest) => Promise<NextResponse>;
