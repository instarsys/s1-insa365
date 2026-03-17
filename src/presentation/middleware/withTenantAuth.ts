import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAuthContext, type AuthContext } from './withAuth';
import { getContainer } from '@/infrastructure/di/container';

/**
 * withAuth + RLS 세션 변수 설정을 결합한 인증 래퍼.
 *
 * 사용 시 PostgreSQL 세션 변수 `app.company_id`가 설정되어
 * RLS 정책이 실제로 동작합니다.
 *
 * 점진 적용: 기존 API는 withAuth 유지, 신규/수정 API부터 withTenantAuth 사용.
 */
export function withTenantAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse | Response>,
) {
  return async (request: NextRequest, _routeContext?: { params?: Promise<Record<string, string>> }) => {
    const auth = getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }

    try {
      // RLS 활성화: PostgreSQL 세션 변수 설정
      const { setTenantContext } = getContainer();
      await setTenantContext(auth.companyId);

      return await handler(request, auth);
    } catch (error) {
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error);
      Sentry.captureException(error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ message }, { status: 500 });
    }
  };
}
