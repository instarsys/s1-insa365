import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit } = parseSearchParams(url);
  const skip = (page - 1) * limit;

  const where = {
    companyId: auth.companyId,
    userId: auth.userId,
  };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ]);

  return successResponse({
    items,
    total,
    unreadCount,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
