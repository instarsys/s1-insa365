import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const dateStr = url.searchParams.get('date');
  const departmentId = url.searchParams.get('departmentId');

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
