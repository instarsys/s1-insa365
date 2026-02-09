import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { withRole } from '@/presentation/middleware/withRole';
import { successResponse, createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveAccrualRuleSchema } from '@/presentation/api/schemas';

async function getHandler(_request: NextRequest, auth: AuthContext) {
  const items = await prisma.leaveAccrualRule.findMany({
    where: { companyId: auth.companyId, deletedAt: null },
    include: {
      leaveGroup: { select: { id: true, name: true } },
      tiers: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return successResponse({ items });
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(createLeaveAccrualRuleSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const existing = await prisma.leaveAccrualRule.findFirst({
      where: { companyId: auth.companyId, name: data.name, deletedAt: null },
    });
    if (existing) return errorResponse('이미 존재하는 규칙명입니다.', 409);

    const rule = await prisma.$transaction(async (tx) => {
      const created = await tx.leaveAccrualRule.create({
        data: {
          companyId: auth.companyId,
          name: data.name,
          leaveGroupId: data.leaveGroupId,
          accrualBasis: data.accrualBasis,
          accrualUnit: data.accrualUnit,
          proRataFirstYear: data.proRataFirstYear,
          description: data.description ?? null,
        },
      });

      await tx.leaveAccrualRuleTier.createMany({
        data: data.tiers.map((tier) => ({
          accrualRuleId: created.id,
          serviceMonthFrom: tier.serviceMonthFrom,
          serviceMonthTo: tier.serviceMonthTo,
          accrualDays: tier.accrualDays,
          validMonths: tier.validMonths ?? null,
          sortOrder: tier.sortOrder,
        })),
      });

      return tx.leaveAccrualRule.findUnique({
        where: { id: created.id },
        include: {
          leaveGroup: { select: { id: true, name: true } },
          tiers: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    return createdResponse(rule);
  } catch {
    return errorResponse('발생 규칙 생성 중 오류가 발생했습니다.', 500);
  }
}

export const GET = withAuth(getHandler) as (request: NextRequest) => Promise<NextResponse>;
export const POST = withRole('COMPANY_ADMIN', postHandler) as (request: NextRequest) => Promise<NextResponse>;
