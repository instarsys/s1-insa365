import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function getHandler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const role = url.searchParams.get('role') || 'MANAGER';

  const { manageRolePermissionsUseCase } = getContainer();
  const permissions = await manageRolePermissionsUseCase.getPermissions(auth.companyId, role);
  return successResponse({ role, items: permissions });
}

async function putHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const { role, permissions } = body;

    if (!role || !Array.isArray(permissions)) {
      return errorResponse('역할과 권한 목록이 필요합니다.', 400);
    }

    const { manageRolePermissionsUseCase } = getContainer();
    await manageRolePermissionsUseCase.updatePermissions(auth.companyId, role, permissions);
    return successResponse({ success: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '권한 설정 저장에 실패했습니다.', 400);
  }
}

export const GET = withRole('COMPANY_ADMIN', getHandler) as (request: NextRequest) => Promise<NextResponse>;
export const PUT = withRole('COMPANY_ADMIN', putHandler) as (request: NextRequest) => Promise<NextResponse>;
