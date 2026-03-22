import { NextRequest, NextResponse } from 'next/server';
import { type AuthContext, getAuthContext } from './withAuth';
import { getContainer } from '@/infrastructure/di/container';

/**
 * 세부 권한 검증 미들웨어
 *
 * COMPANY_ADMIN, SYSTEM_ADMIN → 항상 통과
 * MANAGER → RolePermission DB에서 해당 권한 확인
 * EMPLOYEE → 거부
 */
export function withPermission(
  category: string,
  permission: string,
  handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const auth = getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }

    // COMPANY_ADMIN, SYSTEM_ADMIN → 항상 통과
    if (auth.role === 'COMPANY_ADMIN' || auth.role === 'SYSTEM_ADMIN') {
      return handler(request, auth);
    }

    // EMPLOYEE → 거부
    if (auth.role === 'EMPLOYEE') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
    }

    // MANAGER → DB에서 권한 확인
    try {
      const { rolePermissionRepo } = getContainer();
      const allowed = await rolePermissionRepo.checkPermission(
        auth.companyId, auth.role, category, permission,
      );
      if (!allowed) {
        return NextResponse.json({ message: '해당 작업에 대한 권한이 없습니다.' }, { status: 403 });
      }
      return handler(request, auth);
    } catch {
      return NextResponse.json({ message: '권한 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
  };
}
