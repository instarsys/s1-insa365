import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse, notFoundResponse, validateBody } from '@/presentation/api/helpers';
import { updateSalaryItemsSchema } from '@/presentation/api/schemas/employee';

type RouteContext = { params: Promise<{ id: string }> };

// 법정 공제 코드 (비활성화 불가)
const SYSTEM_MANAGED_CODES = new Set(['D01', 'D02', 'D03', 'D04', 'D05', 'D06']);

async function handleGet(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { employeeRepo } = getContainer();
  const user = await employeeRepo.findById(auth.companyId, id);
  if (!user) return notFoundResponse('직원');

  const { employeeSalaryItemRepo } = getContainer();
  const items = await employeeSalaryItemRepo.findByUserOrdered(auth.companyId, id);

  return successResponse({ items });
}

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();
  const validation = validateBody(updateSalaryItemsSchema, body);
  if (!validation.success) return validation.response;
  const { items } = validation.data;

  const { employeeRepo, auditLogRepo } = getContainer();
  const user = await employeeRepo.findById(auth.companyId, id);
  if (!user) return notFoundResponse('직원');

  const { employeeSalaryItemRepo } = getContainer();
  const currentItems = await employeeSalaryItemRepo.findByUserOrdered(auth.companyId, id);

  try {
    await employeeSalaryItemRepo.updateManyInTransaction(
      auth.companyId,
      items.map((item) => ({
        id: item.id,
        data: {
          ...(item.amount !== undefined && { amount: item.amount }),
          ...(item.isActive !== undefined && { isActive: item.isActive }),
          ...(item.isOrdinaryWage !== undefined && { isOrdinaryWage: item.isOrdinaryWage }),
          ...(item.isTaxExempt !== undefined && { isTaxExempt: item.isTaxExempt }),
          ...(item.paymentMonths !== undefined && { paymentMonths: item.paymentMonths }),
        },
      })),
    );
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '급여 항목 업데이트에 실패했습니다.', 400);
  }

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'EmployeeSalaryItem',
    entityId: id,
    before: { items: items.map(item => {
      const cur = currentItems.find(c => c.id === item.id);
      return cur ? { id: cur.id, amount: Number(cur.amount), isActive: cur.isActive } : null;
    }).filter(Boolean) },
    after: { items },
  });

  const updated = await employeeSalaryItemRepo.findByUserOrdered(auth.companyId, id);

  return successResponse({ items: updated });
}

async function handlePatch(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();
  const { itemId, isActive } = body as { itemId: string; isActive: boolean };

  if (!itemId || typeof isActive !== 'boolean') {
    return errorResponse('itemId와 isActive가 필요합니다.', 400);
  }

  const { employeeRepo, auditLogRepo } = getContainer();
  const user = await employeeRepo.findById(auth.companyId, id);
  if (!user) return notFoundResponse('직원');

  // 대상 항목 조회
  const { employeeSalaryItemRepo } = getContainer();
  const allItems = await employeeSalaryItemRepo.findByUserOrdered(auth.companyId, id);
  const targetItem = allItems.find((i) => i.id === itemId);
  if (!targetItem) return notFoundResponse('급여 항목');

  // 기본급(BASE) 비활성화 방지
  if (targetItem.type === 'BASE' && !isActive) {
    return errorResponse('기본급 항목은 비활성화할 수 없습니다.', 403);
  }

  // 법정 공제(D01-D06) 비활성화 방지
  if (SYSTEM_MANAGED_CODES.has(targetItem.code) && !isActive) {
    return errorResponse('법정 공제 항목은 비활성화할 수 없습니다.', 403);
  }

  const result = await employeeSalaryItemRepo.toggleActive(auth.companyId, itemId, isActive);
  if (!result) return notFoundResponse('급여 항목');

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'EmployeeSalaryItem',
    entityId: itemId,
    before: { isActive: !isActive },
    after: { isActive },
  });

  return successResponse({ item: result });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { employeeRepo, salaryRuleRepo, employeeSalaryItemRepo, auditLogRepo } = getContainer();

  const user = await employeeRepo.findById(auth.companyId, id);
  if (!user) return notFoundResponse('직원');

  const allRules = await salaryRuleRepo.findAll(auth.companyId);
  const activeRules = allRules.filter(r => r.isActive);

  const ruleData = activeRules.map(rule => ({
    code: rule.code,
    name: rule.name,
    type: rule.type,
    paymentType: rule.paymentType,
    paymentCycle: rule.paymentCycle,
    defaultAmount: Number(rule.defaultAmount ?? 0),
    isOrdinaryWage: rule.isOrdinaryWage,
    isTaxExempt: rule.isTaxExempt,
    taxExemptCode: rule.taxExemptCode ?? null,
    sortOrder: rule.sortOrder,
    formula: rule.formula ?? null,
    paymentMonths: rule.paymentMonths ?? null,
  }));

  const result = await employeeSalaryItemRepo.upsertFromRules(auth.companyId, id, ruleData);

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'EmployeeSalaryItem',
    entityId: id,
    after: { mode: 'sync', created: result.created, updated: result.updated, deleted: result.deleted },
  });

  const updatedItems = await employeeSalaryItemRepo.findByUserOrdered(auth.companyId, id);
  return successResponse({ ...result, items: updatedItems });
}

function createHandler(method: 'GET' | 'PUT' | 'PATCH' | 'POST') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { GET: handleGet, PUT: handlePut, PATCH: handlePatch, POST: handlePost };
    const wrapped = withAuth(methods[method]);
    return wrapped(request, routeContext);
  };
}

export const GET = createHandler('GET') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const POST = createHandler('POST') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const PUT = createHandler('PUT') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const PATCH = createHandler('PATCH') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
