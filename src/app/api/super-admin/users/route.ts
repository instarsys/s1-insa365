import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, forbiddenResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'SYSTEM_ADMIN') return forbiddenResponse();

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const companyId = url.searchParams.get('companyId') || undefined;
    const role = url.searchParams.get('role') || undefined;
    const search = url.searchParams.get('search') || undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (companyId) where.companyId = companyId;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeNumber: true,
          employeeStatus: true,
          companyId: true,
          company: { select: { name: true } },
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: where as any }),
    ]);

    return successResponse({
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        employeeNumber: u.employeeNumber,
        employeeStatus: u.employeeStatus,
        companyId: u.companyId,
        companyName: u.company.name,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[SUPER_ADMIN_USERS]', error);
    return errorResponse('사용자 목록 조회에 실패했습니다.', 500);
  }
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
