import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { withRole } from '@/presentation/middleware/withRole';
import { successResponse, createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveAccrualRuleSchema } from '@/presentation/api/schemas';
import { getContainer } from '@/infrastructure/di/container';

async function getHandler(_request: NextRequest, auth: AuthContext) {
  const { leaveAccrualRuleRepo } = getContainer();
  const items = await leaveAccrualRuleRepo.findAll(auth.companyId);

  return successResponse({ items });
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(createLeaveAccrualRuleSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const { leaveAccrualRuleRepo } = getContainer();
    const existing = await leaveAccrualRuleRepo.findByName(auth.companyId, data.name);
    if (existing) return errorResponse('이미 존재하는 규칙명입니다.', 409);

    const rule = await leaveAccrualRuleRepo.createWithTiers(auth.companyId, {
      name: data.name,
      leaveGroupId: data.leaveGroupId,
      accrualBasis: data.accrualBasis,
      accrualUnit: data.accrualUnit,
      proRataFirstYear: data.proRataFirstYear,
      description: data.description ?? null,
      tiers: data.tiers.map((tier) => ({
        serviceMonthFrom: tier.serviceMonthFrom,
        serviceMonthTo: tier.serviceMonthTo,
        accrualDays: tier.accrualDays,
        validMonths: tier.validMonths ?? null,
        sortOrder: tier.sortOrder,
      })),
    });

    return createdResponse(rule);
  } catch {
    return errorResponse('발생 규칙 생성 중 오류가 발생했습니다.', 500);
  }
}

export const GET = withAuth(getHandler) as (request: NextRequest) => Promise<NextResponse>;
export const POST = withRole('COMPANY_ADMIN', postHandler) as (request: NextRequest) => Promise<NextResponse>;
