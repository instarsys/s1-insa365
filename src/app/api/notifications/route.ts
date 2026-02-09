import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit } = parseSearchParams(url);
  const { notificationRepo } = getContainer();

  const [result, unreadCount] = await Promise.all([
    notificationRepo.findByUser(auth.companyId, auth.userId, { page, limit }),
    notificationRepo.getUnreadCount(auth.companyId, auth.userId),
  ]);

  return successResponse({
    items: result.items,
    total: result.total,
    unreadCount,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
