import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { notificationRepo } = getContainer();
  const result = await notificationRepo.markAllRead(auth.companyId, auth.userId);

  return successResponse({ updatedCount: result.count });
}

export const PUT = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
