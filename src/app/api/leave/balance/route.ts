import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, userId } = parseSearchParams(url);
  const targetYear = year ?? new Date().getFullYear();

  // EMPLOYEE sees own balance, MANAGER+ can query specific user
  const targetUserId = auth.role === 'EMPLOYEE' ? auth.userId : (userId ?? auth.userId);

  const balance = await prisma.leaveBalance.findFirst({
    where: {
      companyId: auth.companyId,
      userId: targetUserId,
      year: targetYear,
    },
  });

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
