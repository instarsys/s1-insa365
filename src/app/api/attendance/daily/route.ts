import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const dateStr = url.searchParams.get('date');
  const startDateStr = url.searchParams.get('startDate');
  const endDateStr = url.searchParams.get('endDate');
  const departmentId = url.searchParams.get('departmentId') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const sortKey = url.searchParams.get('sortKey') || 'date';
  const sortDir = (url.searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';

  const { attendanceRepo } = getContainer();

  // Range query mode (목록형)
  if (startDateStr && endDateStr) {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const { items: attendances, total, page: resultPage } = await attendanceRepo.findDailyRange(
      auth.companyId,
      { startDate, endDate, departmentId, status, search, page, limit, sortKey, sortDir },
    );

    const summary = await attendanceRepo.aggregateMinutesByDateRange(
      auth.companyId,
      startDate,
      endDate,
      departmentId,
    );

    return successResponse({
      items: attendances,
      total,
      totalPages: Math.ceil(total / limit),
      page: resultPage,
      summary,
    });
  }

  // Single-date mode (하위호환)
  if (!dateStr) return errorResponse('날짜를 지정해주세요.', 400);

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const { attendances, totalEmployees } = await attendanceRepo.findDailySingle(
    auth.companyId,
    date,
    { departmentId },
  );

  return successResponse({
    date: dateStr,
    totalEmployees,
    checkedIn: attendances.filter((a) => a.checkInTime).length,
    checkedOut: attendances.filter((a) => a.checkOutTime).length,
    items: attendances,
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
