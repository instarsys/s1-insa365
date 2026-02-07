import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { getAuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request);

    if (auth) {
      const user = await prisma.user.findFirst({
        where: { id: auth.userId, companyId: auth.companyId, deletedAt: null },
      });
      if (user) {
        await prisma.user.update({
          where: { id: auth.userId },
          data: { refreshToken: null },
        });
      }

      await auditLogService.log({
        userId: auth.userId,
        companyId: auth.companyId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: auth.userId,
      });
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

    return response;
  } catch {
    return errorResponse('로그아웃 처리 중 오류가 발생했습니다.', 500);
  }
}
