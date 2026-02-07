import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const result = await prisma.notification.updateMany({
    where: {
      userId: auth.userId,
      companyId: auth.companyId,
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  });

  return successResponse({ updatedCount: result.count });
}

export const PUT = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
