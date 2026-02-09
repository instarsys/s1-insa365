import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, userId } = parseSearchParams(url);
  const targetYear = year ?? new Date().getFullYear();

  // EMPLOYEE sees own balance, MANAGER+ can query specific user
  const targetUserId = auth.role === 'EMPLOYEE' ? auth.userId : (userId ?? auth.userId);

  const { leaveBalanceRepo } = getContainer();

  const balance = await leaveBalanceRepo.findByUserAndYear(auth.companyId, targetUserId, targetYear);

  return successResponse({
    balance: balance ?? {
      year: targetYear,
      totalDays: 0,
      usedDays: 0,
      remainingDays: 0,
    },
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
