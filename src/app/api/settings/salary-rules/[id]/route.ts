import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse, noContentResponse, errorResponse } from '@/presentation/api/helpers';
import { FormulaEngine } from '@/domain/services/FormulaEngine';
import { isLegacyAllowanceKeyword } from '@/domain/services/GrossPayCalculator';
import { isLegacyDeductionKeyword } from '@/domain/services/DeductionCalculator';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const existing = await getContainer().salaryRuleRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('급여 항목');

  if (existing.isSystemManaged) {
    return errorResponse('법정 공제 규칙은 시스템에서 관리하므로 수정할 수 없습니다.', 403);
  }

  // FORMULA 타입 수식 검증
  if (body.formula !== undefined && body.formula) {
    const paymentType = body.paymentType ?? existing.paymentType;
    if (paymentType === 'FORMULA') {
      const isLegacy = isLegacyAllowanceKeyword(body.formula) || isLegacyDeductionKeyword(body.formula);
      if (!isLegacy) {
        const validation = FormulaEngine.validate(body.formula);
        if (!validation.valid) {
          return errorResponse(`수식 오류: ${validation.error}`, 400);
        }
      }
    }
  }

  const updated = await getContainer().salaryRuleRepo.update(auth.companyId, id, {
    ...(body.name && { name: body.name }),
    ...(body.paymentType && { paymentType: body.paymentType }),
    ...(body.paymentCycle && { paymentCycle: body.paymentCycle }),
    ...(body.defaultAmount !== undefined && { defaultAmount: body.defaultAmount }),
    ...(body.isOrdinaryWage !== undefined && { isOrdinaryWage: body.isOrdinaryWage }),
    ...(body.isTaxExempt !== undefined && { isTaxExempt: body.isTaxExempt }),
    ...(body.taxExemptCode !== undefined && { taxExemptCode: body.taxExemptCode }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.formula !== undefined && { formula: body.formula }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
  });

  // 규칙 속성 변경 시 전체 직원에게 자동 동기화 (금액 보존, 속성만 업데이트)
  const { employeeSalaryItemRepo, userRepo, salaryRuleRepo, auditLogRepo } = getContainer();
  let syncedEmployeeCount = 0;

  const hasPropertyChange = ['name', 'paymentType', 'paymentCycle', 'isOrdinaryWage', 'isTaxExempt', 'taxExemptCode', 'formula', 'sortOrder', 'isActive'].some(
    (key) => body[key] !== undefined && body[key] !== (existing as Record<string, unknown>)[key],
  );

  if (hasPropertyChange) {
    const allRules = await salaryRuleRepo.findAll(auth.companyId);
    const activeRules = allRules.filter((r: { isActive: boolean }) => r.isActive);
    const ruleData = activeRules.map((rule: Record<string, unknown>) => ({
      code: rule.code as string,
      name: rule.name as string,
      type: rule.type as string,
      paymentType: rule.paymentType as string,
      paymentCycle: rule.paymentCycle as string,
      defaultAmount: Number(rule.defaultAmount ?? 0),
      isOrdinaryWage: rule.isOrdinaryWage as boolean,
      isTaxExempt: rule.isTaxExempt as boolean,
      taxExemptCode: (rule.taxExemptCode as string) ?? null,
      sortOrder: rule.sortOrder as number,
      formula: (rule.formula as string) ?? null,
    }));

    const activeUsers = await userRepo.findActiveUsers(auth.companyId);
    for (const user of activeUsers) {
      await employeeSalaryItemRepo.upsertFromRules(auth.companyId, user.id, ruleData as unknown as Parameters<typeof employeeSalaryItemRepo.upsertFromRules>[2]);
      syncedEmployeeCount++;
    }
  }

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'SalaryRule',
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: { ...body as Record<string, unknown>, syncedEmployees: syncedEmployeeCount },
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const existing = await getContainer().salaryRuleRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('급여 항목');

  if (existing.isSystemManaged) {
    return errorResponse('법정 공제 규칙은 삭제할 수 없습니다.', 403);
  }

  const { auditLogRepo } = getContainer();
  await getContainer().salaryRuleRepo.softDelete(auth.companyId, id);

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'DELETE',
    entityType: 'SalaryRule',
    entityId: id,
    before: { code: existing.code, name: existing.name } as Record<string, string>,
  });

  return noContentResponse();
}

function createHandler(method: 'PUT' | 'DELETE') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { PUT: handlePut, DELETE: handleDelete };
    const wrapped = withRole('COMPANY_ADMIN', methods[method]);
    return wrapped(request);
  };
}

export const PUT = createHandler('PUT') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createHandler('DELETE') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
