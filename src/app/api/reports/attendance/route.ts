import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

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

  const { departmentRepo, attendanceRepo, employeeRepo } = getContainer();

  const [departments, attendances, countMap] = await Promise.all([
    departmentRepo.findAll(auth.companyId),
    attendanceRepo.findAllByDateRange(auth.companyId, startDate, endDate),
    employeeRepo.countByDepartment(auth.companyId),
  ]);

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
