import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, auth: AuthContext) {
  const policies = await prisma.workPolicy.findMany({
    where: { companyId: auth.companyId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { users: { where: { deletedAt: null } } } } },
  });

  return successResponse({ items: policies });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'SYSTEM_ADMIN') {
    return errorResponse('권한이 없습니다.', 403);
  }

  const { name, startTime, endTime, breakMinutes, workDays, isDefault } = await request.json();

  if (!name || !startTime || !endTime) {
    return errorResponse('이름, 시작시간, 종료시간은 필수입니다.', 400);
  }

  if (isDefault) {
    await prisma.workPolicy.updateMany({
      where: { companyId: auth.companyId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const policy = await prisma.workPolicy.create({
    data: {
      companyId: auth.companyId,
      name,
      startTime,
      endTime,
      breakMinutes: breakMinutes ?? 60,
      workDays: workDays ?? '1,2,3,4,5',
      isDefault: isDefault ?? false,
    },
  });

  return createdResponse(policy);
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'GET') return handleGet(request, auth);
  return handlePost(request, auth);
});
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
