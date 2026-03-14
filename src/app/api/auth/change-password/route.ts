import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { passwordService } from '@/infrastructure/auth/PasswordService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, '새 비밀번호는 8자 이상이어야 합니다.').max(100),
});

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const result = changePasswordSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues.map((e) => e.message).join(', ');
      return errorResponse(message, 400);
    }

    const { currentPassword, newPassword } = result.data;
    const { userRepo, auditLogRepo } = getContainer();

    const user = await userRepo.findById(auth.userId);
    if (!user) {
      return errorResponse('사용자를 찾을 수 없습니다.', 404);
    }

    // mustChangePassword가 아닌 일반 변경 시 현재 비밀번호 검증 필수
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return errorResponse('현재 비밀번호를 입력해주세요.', 400);
      }
      const isValid = await passwordService.verify(currentPassword, user.password);
      if (!isValid) {
        return errorResponse('현재 비밀번호가 올바르지 않습니다.', 401);
      }
    }

    const hashedPassword = await passwordService.hash(newPassword);
    await userRepo.update(auth.companyId, auth.userId, {
      password: hashedPassword,
      mustChangePassword: false,
    });

    await auditLogRepo.create({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: auth.userId,
      after: { field: 'password', mustChangePassword: false } as Record<string, unknown>,
    });

    return successResponse({ message: '비밀번호가 변경되었습니다.' });
  } catch {
    return errorResponse('비밀번호 변경 중 오류가 발생했습니다.', 500);
  }
}

const wrapped = withAuth(handler);
export const PUT = wrapped as (request: NextRequest) => Promise<NextResponse>;
