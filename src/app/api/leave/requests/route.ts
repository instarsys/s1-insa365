import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';
import type { LeaveStatus } from '@/generated/prisma/enums';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit, status, userId } = parseSearchParams(url);
  const type = url.searchParams.get('type') ?? undefined;
  const departmentId = url.searchParams.get('departmentId') ?? undefined;

  // EMPLOYEE can only see own requests, MANAGER+ can see all
  const targetUserId = auth.role === 'EMPLOYEE' ? auth.userId : (userId ?? undefined);

  const { leaveRequestRepo } = getContainer();

  const result = await leaveRequestRepo.findAllWithGroupAndPagination(auth.companyId, {
    userId: targetUserId,
    status: status as LeaveStatus | undefined,
    type,
    departmentId,
    page,
    limit,
  });

  return successResponse({
    items: result.items.map(item => ({
      ...item,
      userName: item.user?.name ?? '',
      employeeNumber: item.user?.employeeNumber ?? '',
      departmentName: item.user?.department?.name ?? '',
    })),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: Math.ceil(result.total / result.limit),
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
