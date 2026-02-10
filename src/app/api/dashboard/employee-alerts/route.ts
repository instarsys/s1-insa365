import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { employeeRepo } = getContainer();
  const alerts = await employeeRepo.getManagementAlerts(auth.companyId);

  return successResponse(alerts);
}

export const GET = withAuth(handler);
