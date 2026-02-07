import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit, userId } = parseSearchParams(url);
  const skip = (page - 1) * limit;

  // EMPLOYEE sees own history only
  const targetUserId = auth.role === 'EMPLOYEE' ? auth.userId : (userId ?? undefined);

  const where = {
    companyId: auth.companyId,
    deletedAt: null,
    status: { in: ['CONFIRMED' as const, 'PAID' as const] },
    ...(targetUserId && { userId: targetUserId }),
  };

  const [items, total] = await Promise.all([
    prisma.salaryCalculation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.salaryCalculation.count({ where }),
  ]);

  return successResponse({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
