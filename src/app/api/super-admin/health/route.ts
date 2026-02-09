import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, forbiddenResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'SYSTEM_ADMIN') return forbiddenResponse();

  try {
    const { companyRepo, userRepo, salaryCalcRepo } = getContainer();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [companyCount, userCount, payrollStats] = await Promise.all([
      companyRepo.countAll(),
      userRepo.countAll(),
      salaryCalcRepo.groupByStatusGlobal(year, month),
    ]);

    const payrollByStatus: Record<string, number> = {};
    for (const s of payrollStats) {
      payrollByStatus[s.status] = s.count;
    }

    return successResponse({
      companyCount,
      userCount,
      payroll: {
        year,
        month,
        confirmed: payrollByStatus['CONFIRMED'] ?? 0,
        draft: payrollByStatus['DRAFT'] ?? 0,
        paid: payrollByStatus['PAID'] ?? 0,
      },
      uptime: Math.floor(process.uptime()),
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[SUPER_ADMIN_HEALTH]', error);
    return errorResponse('시스템 상태 조회에 실패했습니다.', 500);
  }
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
