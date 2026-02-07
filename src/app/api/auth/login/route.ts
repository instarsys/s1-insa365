import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { jwtService } from '@/infrastructure/auth/JwtService';
import { passwordService } from '@/infrastructure/auth/PasswordService';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse('이메일과 비밀번호를 입력해주세요.', 400);
    }

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { company: true },
    });

    if (!user || !(await passwordService.verify(password, user.password))) {
      return errorResponse('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const tokenPayload = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      canViewSensitive: user.canViewSensitive,
    };

    const accessToken = jwtService.generateAccessToken(tokenPayload);
    const refreshToken = jwtService.generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    await auditLogService.log({
      userId: user.id,
      companyId: user.companyId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    const response = successResponse({
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeNumber: user.employeeNumber,
        canViewSensitive: user.canViewSensitive,
        companyName: user.company.name,
      },
    });

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 604800,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return errorResponse('로그인 처리 중 오류가 발생했습니다.', 500);
  }
}
