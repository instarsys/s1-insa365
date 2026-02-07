import { NextRequest, NextResponse } from 'next/server';
import { type AuthContext, getAuthContext } from './withAuth';

type Role = 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';

const ROLE_HIERARCHY: Record<Role, number> = {
  SYSTEM_ADMIN: 4,
  COMPANY_ADMIN: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
};

export function withRole(
  requiredRole: Role,
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const auth = getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }

    if (ROLE_HIERARCHY[auth.role] < ROLE_HIERARCHY[requiredRole]) {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
    }

    return handler(request, auth);
  };
}
