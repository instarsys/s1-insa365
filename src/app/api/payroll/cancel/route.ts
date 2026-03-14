import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';

import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { year, month } = await request.json();

    if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

    const { salaryCalcRepo, auditLogRepo } = getContainer();

    const calculations = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);
    const confirmed = calculations.filter((c) => c.status === 'CONFIRMED');

    if (confirmed.length === 0) {
      return errorResponse('취소할 확정 급여가 없습니다.', 400);
    }

    // Check 24h cancel window
    const firstConfirmed = confirmed[0];
    if (firstConfirmed.confirmedAt) {
      const confirmedTime = typeof firstConfirmed.confirmedAt === 'string'
        ? new Date(firstConfirmed.confirmedAt).getTime()
        : firstConfirmed.confirmedAt.getTime();
      const hoursSinceConfirm = (Date.now() - confirmedTime) / (1000 * 60 * 60);
      if (hoursSinceConfirm > 24) {
        return errorResponse('확정 후 24시간이 지나 취소할 수 없습니다.', 400);
      }
    }

    // Revert CONFIRMED → DRAFT
    await salaryCalcRepo.revertConfirmedToDraft(auth.companyId, year, month);

    await auditLogRepo.create({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CANCEL',
      entityType: 'SalaryCalculation',
      after: { year, month, cancelledCount: confirmed.length } as Record<string, unknown>,
    });

    return successResponse({ cancelledCount: confirmed.length });
  } catch {
    return errorResponse('급여 취소 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
