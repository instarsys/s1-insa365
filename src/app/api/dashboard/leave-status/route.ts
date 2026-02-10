import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { leaveBalanceRepo } = getContainer();
  const year = new Date().getFullYear();
  const items = await leaveBalanceRepo.findAllByYearWithUser(auth.companyId, year);

  return successResponse({ items });
}

export const GET = withAuth(handler);
