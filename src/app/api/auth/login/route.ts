import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { jwtService } from '@/infrastructure/auth/JwtService';
import { passwordService } from '@/infrastructure/auth/PasswordService';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { loginSchema } from '@/presentation/api/schemas';
import { rateLimit, getClientIp } from '@/presentation/middleware/rateLimit';

export async function POST(request: NextRequest) {
  const rateLimited = rateLimit(`login:${getClientIp(request.headers)}`, 5, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const validation = validateBody(loginSchema, body);
    if (!validation.success) return validation.response;
    const { email, password } = validation.data;

    const { userRepo } = getContainer();

    const user = await userRepo.findByEmail(email);

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

    await userRepo.updateRefreshToken(user.companyId, user.id, refreshToken);

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
