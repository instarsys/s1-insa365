import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';
import type { LeaveType } from '@/generated/prisma/enums';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit, status, userId } = parseSearchParams(url);
  const skip = (page - 1) * limit;
  const type = url.searchParams.get('type') ?? undefined;
  const departmentId = url.searchParams.get('departmentId') ?? undefined;

  // EMPLOYEE can only see own requests, MANAGER+ can see all
  const targetUserId = auth.role === 'EMPLOYEE' ? auth.userId : (userId ?? undefined);

  const where = {
    companyId: auth.companyId,
    deletedAt: null,
    ...(targetUserId && { userId: targetUserId }),
    ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' }),
    ...(type && { type: type as LeaveType }),
    ...(departmentId && { user: { departmentId } }),
  };

  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({
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
        leaveTypeConfig: {
          select: {
            id: true,
            code: true,
            name: true,
            leaveGroup: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return successResponse({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
