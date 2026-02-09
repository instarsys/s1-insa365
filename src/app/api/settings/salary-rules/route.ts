import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, auth: AuthContext) {
  const rules = await getContainer().salaryRuleRepo.findAllOrdered(auth.companyId);

  return successResponse({ items: rules });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'SYSTEM_ADMIN') {
    return errorResponse('권한이 없습니다.', 403);
  }

  const body = await request.json();
  const { code, name, type, paymentType, paymentCycle, defaultAmount, isOrdinaryWage, isTaxExempt, taxExemptCode, formula, description } = body;

  if (!code || !name || !type) {
    return errorResponse('코드, 이름, 유형은 필수입니다.', 400);
  }

  const existing = await getContainer().salaryRuleRepo.findByCode(auth.companyId, code);
  if (existing) return errorResponse('이미 존재하는 코드입니다.', 409);

  const rule = await getContainer().salaryRuleRepo.create(auth.companyId, {
    companyId: auth.companyId,
    code,
    name,
    type,
    paymentType: paymentType ?? 'FIXED',
    paymentCycle: paymentCycle ?? 'MONTHLY',
    defaultAmount: defaultAmount ?? null,
    isOrdinaryWage: isOrdinaryWage ?? false,
    isTaxExempt: isTaxExempt ?? false,
    taxExemptCode: taxExemptCode ?? null,
    formula: formula ?? null,
    description: description ?? null,
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'CREATE',
    entityType: 'SalaryRule',
    entityId: rule.id,
    after: { code, name, type } as Record<string, string>,
  });

  return createdResponse(rule);
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'GET') return handleGet(request, auth);
  return handlePost(request, auth);
});
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
