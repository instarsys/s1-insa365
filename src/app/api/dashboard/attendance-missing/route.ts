import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { attendanceRepo } = getContainer();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const items = await attendanceRepo.findMissingCheckouts(auth.companyId, startDate, endDate);

  return successResponse({ items });
}

export const GET = withAuth(handler);
