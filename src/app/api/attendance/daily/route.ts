import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

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

  // Range query mode (목록형)
  if (startDateStr && endDateStr) {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      companyId: auth.companyId,
      date: { gte: startDate, lte: endDate },
      deletedAt: null,
    };
    if (departmentId) {
      where.user = { departmentId };
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.user = {
        ...(where.user as Record<string, unknown> || {}),
        name: { contains: search },
      };
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, unknown> = {};
    if (sortKey === 'userName') {
      orderBy.user = { name: sortDir };
    } else if (sortKey === 'departmentName') {
      orderBy.user = { department: { name: sortDir } };
    } else if (sortKey === 'date') {
      orderBy.date = sortDir;
    } else if (sortKey === 'checkInTime') {
      orderBy.checkInTime = sortDir;
    } else if (sortKey === 'checkOutTime') {
      orderBy.checkOutTime = sortDir;
    } else if (sortKey === 'totalMinutes') {
      orderBy.totalMinutes = sortDir;
    } else {
      orderBy.date = sortDir;
    }

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeNumber: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: [orderBy],
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    // Summary aggregation
    const allForSummary = await prisma.attendance.aggregate({
      where: {
        companyId: auth.companyId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        ...(departmentId && { user: { departmentId } }),
      },
      _sum: {
        regularMinutes: true,
        overtimeMinutes: true,
        nightMinutes: true,
        totalMinutes: true,
      },
    });

    return successResponse({
      items: attendances,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      summary: {
        totalRegularMinutes: allForSummary._sum.regularMinutes ?? 0,
        totalOvertimeMinutes: allForSummary._sum.overtimeMinutes ?? 0,
        totalNightMinutes: allForSummary._sum.nightMinutes ?? 0,
        totalMinutes: allForSummary._sum.totalMinutes ?? 0,
      },
    });
  }

  // Single-date mode (하위호환)
  if (!dateStr) return errorResponse('날짜를 지정해주세요.', 400);

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const userWhere = {
    companyId: auth.companyId,
    deletedAt: null,
    employeeStatus: 'ACTIVE' as const,
    ...(departmentId && { departmentId }),
  };

  const [attendances, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        companyId: auth.companyId,
        date,
        deletedAt: null,
        ...(departmentId && { user: { departmentId } }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  return successResponse({
    date: dateStr,
    totalEmployees: employees,
    checkedIn: attendances.filter((a) => a.checkInTime).length,
    checkedOut: attendances.filter((a) => a.checkOutTime).length,
    items: attendances,
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
