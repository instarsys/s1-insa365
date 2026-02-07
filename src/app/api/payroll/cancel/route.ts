import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { year, month } = await request.json();

    if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

    const confirmed = await prisma.salaryCalculation.findMany({
      where: {
        companyId: auth.companyId,
        year,
        month,
        status: 'CONFIRMED',
        deletedAt: null,
      },
    });

    if (confirmed.length === 0) {
      return errorResponse('취소할 확정 급여가 없습니다.', 400);
    }

    // Check 24h cancel window
    const firstConfirmed = confirmed[0];
    if (firstConfirmed.confirmedAt) {
      const hoursSinceConfirm = (Date.now() - firstConfirmed.confirmedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceConfirm > 24) {
        return errorResponse('확정 후 24시간이 지나 취소할 수 없습니다.', 400);
      }
    }

    await prisma.salaryCalculation.updateMany({
      where: {
        companyId: auth.companyId,
        year,
        month,
        status: 'CONFIRMED',
        deletedAt: null,
      },
      data: {
        status: 'DRAFT',
        confirmedAt: null,
        confirmedBy: null,
      },
    });

    await auditLogService.log({
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
