import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveAccrualRuleSchema } from '@/presentation/api/schemas';

type RouteContext = { params: Promise<{ id: string }> };

async function putHandler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  try {
    const rule = await prisma.leaveAccrualRule.findFirst({
      where: { id, companyId: auth.companyId, deletedAt: null },
    });
    if (!rule) return notFoundResponse('발생 규칙');

    const body = await request.json();
    const validation = validateBody(createLeaveAccrualRuleSchema.partial(), body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.leaveAccrualRule.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.leaveGroupId !== undefined && { leaveGroupId: data.leaveGroupId }),
          ...(data.accrualBasis !== undefined && { accrualBasis: data.accrualBasis }),
          ...(data.accrualUnit !== undefined && { accrualUnit: data.accrualUnit }),
          ...(data.proRataFirstYear !== undefined && { proRataFirstYear: data.proRataFirstYear }),
          ...(data.description !== undefined && { description: data.description }),
        },
      });

      if (data.tiers) {
        await tx.leaveAccrualRuleTier.deleteMany({ where: { accrualRuleId: id } });
        await tx.leaveAccrualRuleTier.createMany({
          data: data.tiers.map((tier) => ({
            accrualRuleId: id,
            serviceMonthFrom: tier.serviceMonthFrom,
            serviceMonthTo: tier.serviceMonthTo,
            accrualDays: tier.accrualDays,
            validMonths: tier.validMonths ?? null,
            sortOrder: tier.sortOrder,
          })),
        });
      }

      return tx.leaveAccrualRule.findUnique({
        where: { id },
        include: {
          leaveGroup: { select: { id: true, name: true } },
          tiers: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    return successResponse(updated);
  } catch {
    return errorResponse('발생 규칙 수정 중 오류가 발생했습니다.', 500);
  }
}

async function deleteHandler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const rule = await prisma.leaveAccrualRule.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!rule) return notFoundResponse('발생 규칙');

  await prisma.leaveAccrualRule.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
}

function createRoute(handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withRole('COMPANY_ADMIN', handler);
    return wrapped(request);
  };
}

export const PUT = createRoute(putHandler) as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createRoute(deleteHandler) as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
