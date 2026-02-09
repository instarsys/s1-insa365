import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);
  const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1), 10);
  const departmentId = url.searchParams.get('departmentId') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const employeeStatus = url.searchParams.get('employeeStatus') || 'ACTIVE';

  if (month < 1 || month > 12) return errorResponse('올바른 월을 지정해주세요.', 400);

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, month - 1, daysInMonth);
  endDate.setHours(23, 59, 59, 999);

  const userWhere = {
    companyId: auth.companyId,
    deletedAt: null,
    employeeStatus: employeeStatus as 'ACTIVE' | 'RESIGNED',
    ...(departmentId && { departmentId }),
  };

  const skip = (page - 1) * limit;

  const [users, totalEmployees] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        employeeNumber: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  const userIds = users.map((u) => u.id);

  const attendances = userIds.length > 0
    ? await prisma.attendance.findMany({
        where: {
          companyId: auth.companyId,
          userId: { in: userIds },
          date: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
          date: true,
          checkInTime: true,
          checkOutTime: true,
          status: true,
          isConfirmed: true,
          totalMinutes: true,
          note: true,
        },
      })
    : [];

  // Build per-user, per-day map
  const items = users.map((user) => {
    const userAttendances = attendances.filter((a) => a.userId === user.id);
    const attendancesByDay: Record<number, {
      id: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      status: string;
      isConfirmed: boolean;
      totalMinutes: number;
      note: string | null;
    } | null> = {};

    let workDays = 0;
    for (const att of userAttendances) {
      const day = new Date(att.date).getDate();
      attendancesByDay[day] = {
        id: att.id,
        checkInTime: att.checkInTime?.toISOString() ?? null,
        checkOutTime: att.checkOutTime?.toISOString() ?? null,
        status: att.status,
        isConfirmed: att.isConfirmed,
        totalMinutes: att.totalMinutes,
        note: att.note,
      };
      if (att.checkInTime) workDays++;
    }

    return {
      userId: user.id,
      userName: user.name,
      employeeNumber: user.employeeNumber,
      departmentName: user.department?.name ?? null,
      workDays,
      attendances: attendancesByDay,
    };
  });

  // Daily summary: count of employees who checked in per day
  const dailySummary: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailySummary[d] = attendances.filter((a) => {
      const day = new Date(a.date).getDate();
      return day === d && a.checkInTime;
    }).length;
  }

  return successResponse({
    year,
    month,
    daysInMonth,
    totalEmployees,
    totalPages: Math.ceil(totalEmployees / limit),
    page,
    items,
    dailySummary,
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
