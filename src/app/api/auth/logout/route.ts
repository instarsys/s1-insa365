import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { getAuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request);

    if (auth) {
      try {
        const { userRepo, auditLogRepo } = getContainer();
        await userRepo.updateRefreshToken(auth.companyId, auth.userId, null);

        await auditLogRepo.create({
          userId: auth.userId,
          companyId: auth.companyId,
          action: 'LOGOUT',
          entityType: 'User',
          entityId: auth.userId,
        });
      } catch (e) {
        console.error('Logout cleanup failed:', e);
        // DB 작업 실패해도 쿠키 삭제는 계속 진행
      }
    }

    const response = successResponse({ message: '로그아웃되었습니다.' });

    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    response.cookies.set('user_role', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch {
    return errorResponse('로그아웃 처리 중 오류가 발생했습니다.', 500);
  }
}
