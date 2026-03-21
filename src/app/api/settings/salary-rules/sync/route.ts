import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handlePost(_request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'SYSTEM_ADMIN') {
    return errorResponse('권한이 없습니다.', 403);
  }

  const { salaryRuleRepo, userRepo, employeeSalaryItemRepo, auditLogRepo } = getContainer();

  // 활성 규칙 조회
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
  }));

  // 재직 직원 목록
  const activeUsers = await userRepo.findActiveUsers(auth.companyId);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;

  for (const user of activeUsers) {
    const result = await employeeSalaryItemRepo.upsertFromRules(auth.companyId, user.id, ruleData);
    totalCreated += result.created;
    totalUpdated += result.updated;
    totalDeleted += result.deleted;
  }

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'EmployeeSalaryItem',
    entityId: 'BULK_SYNC',
    after: { totalEmployees: activeUsers.length, created: totalCreated, updated: totalUpdated, deleted: totalDeleted },
  });

  return successResponse({
    totalEmployees: activeUsers.length,
    created: totalCreated,
    updated: totalUpdated,
    deleted: totalDeleted,
  });
}

const wrapped = withAuth(handlePost);
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
