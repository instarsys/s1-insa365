import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const view = url.searchParams.get('view') ?? 'list';
  const year = url.searchParams.get('year')
    ? parseInt(url.searchParams.get('year')!, 10)
    : new Date().getFullYear();
  const departmentId = url.searchParams.get('departmentId') ?? undefined;
  const userId = url.searchParams.get('userId') ?? undefined;

  const { leaveRequestRepo } = getContainer();
  const filters = { userId, departmentId };

  if (view === 'type') {
    const requests = await leaveRequestRepo.findByYearForTypeView(auth.companyId, year, filters);

    const grouped: Record<string, {
      code: string;
      name: string;
      items: typeof requests;
      totalDays: number;
      count: number;
    }> = {};

    for (const req of requests) {
      const code = req.leaveTypeConfig?.code ?? req.type;
      const name = req.leaveTypeConfig?.name ?? req.type;
      if (!grouped[code]) {
        grouped[code] = { code, name, items: [], totalDays: 0, count: 0 };
      }
      grouped[code].items.push(req);
      grouped[code].totalDays += Number(req.days);
      grouped[code].count++;
    }

    return successResponse({ view: 'type', year, groups: Object.values(grouped) });
  }

  if (view === 'monthly') {
    const requests = await leaveRequestRepo.findByYearForMonthlyView(auth.companyId, year, filters);

    const monthlyGrid: Record<string, {
      userId: string;
      userName: string;
      departmentName: string | null;
      months: { month: number; count: number; days: number }[];
      totalCount: number;
      totalDays: number;
    }> = {};

    for (const req of requests) {
      const uid = req.userId;
      if (!monthlyGrid[uid]) {
        monthlyGrid[uid] = {
          userId: uid,
          userName: req.user.name,
          departmentName: req.user.department?.name ?? null,
          months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0, days: 0 })),
          totalCount: 0,
          totalDays: 0,
        };
      }
      const monthIdx = new Date(req.startDate).getMonth();
      const days = Number(req.days);
      monthlyGrid[uid].months[monthIdx].count++;
      monthlyGrid[uid].months[monthIdx].days += days;
      monthlyGrid[uid].totalCount++;
      monthlyGrid[uid].totalDays += days;
    }

    const items = Object.values(monthlyGrid).sort((a, b) =>
      a.userName.localeCompare(b.userName, 'ko'),
    );

    return successResponse({ view: 'monthly', year, items });
  }

  // Default: list view
  const requests = await leaveRequestRepo.findByYearForListView(auth.companyId, year, filters);

  return successResponse({ view: 'list', year, items: requests });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
