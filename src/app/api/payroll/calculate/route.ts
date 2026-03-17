import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';

import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { calculatePayrollSchema } from '@/presentation/api/schemas';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(calculatePayrollSchema, body);
    if (!validation.success) return validation.response;
    const { year, month } = validation.data;

    const { calculatePayrollUseCase, auditLogRepo } = getContainer();
    const results = await calculatePayrollUseCase.execute(auth.companyId, year, month);

    await auditLogRepo.create({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CREATE',
      entityType: 'SalaryCalculation',
      after: { year, month, employeeCount: results.length } as Record<string, unknown>,
    });

    const skippedItems = results.filter((r) => r.status === 'SKIPPED');
    const calculatedItems = results.filter((r) => r.status !== 'SKIPPED');

    return successResponse({
      year,
      month,
      calculatedCount: calculatedItems.length,
      skippedCount: skippedItems.length,
      items: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '급여 계산 중 오류가 발생했습니다.';
    return errorResponse(message, 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
