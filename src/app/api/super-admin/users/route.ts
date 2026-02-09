import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, forbiddenResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'SYSTEM_ADMIN') return forbiddenResponse();

  try {
    const { userRepo } = getContainer();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const companyId = url.searchParams.get('companyId') || undefined;
    const role = url.searchParams.get('role') || undefined;
    const search = url.searchParams.get('search') || undefined;

    const result = await userRepo.findAllGlobal({ page, limit, companyId, role, search });

    return successResponse({
      items: result.items.map((u) => ({
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
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (error) {
    console.error('[SUPER_ADMIN_USERS]', error);
    return errorResponse('사용자 목록 조회에 실패했습니다.', 500);
  }
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
