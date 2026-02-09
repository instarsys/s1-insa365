import { NextRequest } from 'next/server';
import { jwtService } from '@/infrastructure/auth/JwtService';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
      return errorResponse('리프레시 토큰이 없습니다.', 401);
    }

    let payload;
    try {
      payload = jwtService.verifyRefreshToken(refreshToken);
    } catch {
      return errorResponse('유효하지 않은 리프레시 토큰입니다.', 401);
    }

    const { userRepo } = getContainer();
    const user = await userRepo.findByIdAndRefreshToken(payload.userId, refreshToken);

    if (!user) {
      return errorResponse('유효하지 않은 리프레시 토큰입니다.', 401);
    }

    const tokenPayload = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      canViewSensitive: user.canViewSensitive,
    };

    const newAccessToken = jwtService.generateAccessToken(tokenPayload);

    const response = successResponse({ message: '토큰이 갱신되었습니다.' });

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    return response;
  } catch {
    return errorResponse('토큰 갱신 중 오류가 발생했습니다.', 500);
  }
}
