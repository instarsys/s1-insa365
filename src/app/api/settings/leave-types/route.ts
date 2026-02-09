import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { withRole } from '@/presentation/middleware/withRole';
import { successResponse, createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveTypeConfigSchema } from '@/presentation/api/schemas';

async function getHandler(_request: NextRequest, auth: AuthContext) {
  const items = await prisma.leaveTypeConfig.findMany({
    where: { companyId: auth.companyId, deletedAt: null },
    include: {
      leaveGroup: { select: { id: true, name: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return successResponse({ items });
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(createLeaveTypeConfigSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const existing = await prisma.leaveTypeConfig.findFirst({
      where: { companyId: auth.companyId, code: data.code, deletedAt: null },
    });
    if (existing) return errorResponse('이미 존재하는 휴가 유형 코드입니다.', 409);

    const typeConfig = await prisma.leaveTypeConfig.create({
      data: {
        companyId: auth.companyId,
        code: data.code,
        name: data.name,
        leaveGroupId: data.leaveGroupId ?? null,
        timeOption: data.timeOption,
        paidHours: data.paidHours,
        deductionDays: data.deductionDays,
        deductsFromBalance: data.deductsFromBalance,
        requiresApproval: data.requiresApproval,
        maxConsecutiveDays: data.maxConsecutiveDays ?? null,
        description: data.description ?? null,
        sortOrder: data.sortOrder,
      },
    });

    return createdResponse(typeConfig);
  } catch {
    return errorResponse('휴가 유형 생성 중 오류가 발생했습니다.', 500);
  }
}

export const GET = withAuth(getHandler) as (request: NextRequest) => Promise<NextResponse>;
export const POST = withRole('COMPANY_ADMIN', postHandler) as (request: NextRequest) => Promise<NextResponse>;
