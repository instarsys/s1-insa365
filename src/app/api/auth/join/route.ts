import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { passwordService } from '@/infrastructure/auth/PasswordService';
import { jwtService } from '@/infrastructure/auth/JwtService';
import { errorResponse, validateBody } from '@/presentation/api/helpers';
import { z } from 'zod';

const joinSchema = z.object({
  inviteCode: z.string().min(6, '초대 코드를 입력해주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateBody(joinSchema, body);
    if (!validation.success) return validation.response;

    const { invitationRepo, userRepo, employeeRepo, salaryRuleRepo, employeeSalaryItemRepo } = getContainer();
    const { inviteCode, password, email } = validation.data;

    // 코드 검증
    const invitation = await invitationRepo.findByCode(inviteCode);
    if (!invitation) return errorResponse('유효하지 않은 초대 코드입니다.', 404);
    if (invitation.status === 'ACCEPTED') return errorResponse('이미 사용된 초대 코드입니다.', 400);
    if (invitation.status === 'CANCELLED') return errorResponse('취소된 초대입니다.', 400);
    if (new Date() > invitation.expiresAt) return errorResponse('만료된 초대 코드입니다.', 400);

    // 이메일 중복 체크
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) return errorResponse('이미 사용 중인 이메일입니다.', 409);

    const hashedPassword = await passwordService.hash(password);

    // 직원 생성
    const nextNumber = await employeeRepo.getNextEmployeeNumber(invitation.companyId, 'E');
    const user = await employeeRepo.createUnchecked(invitation.companyId, {
      companyId: invitation.companyId,
      email,
      password: hashedPassword,
      name: invitation.name,
      role: 'EMPLOYEE',
      employeeNumber: nextNumber,
      employeeStatus: 'ACTIVE',
      departmentId: invitation.departmentId,
      positionId: invitation.positionId,
    });

    // 급여 규칙 복사
    const salaryRules = await salaryRuleRepo.findAll(invitation.companyId);
    const activeRules = salaryRules.filter((rule) => rule.isActive);

    if (activeRules.length > 0) {
      await employeeSalaryItemRepo.createMany(
        activeRules.map((rule) => ({
          companyId: invitation.companyId,
          userId: user.id,
          code: rule.code,
          name: rule.name,
          type: rule.type,
          paymentType: rule.paymentType,
          paymentCycle: rule.paymentCycle,
          amount: rule.defaultAmount ?? 0,
          isOrdinaryWage: rule.isOrdinaryWage,
          isTaxExempt: rule.isTaxExempt,
          taxExemptCode: rule.taxExemptCode,
          sortOrder: rule.sortOrder,
          formula: rule.formula,
        })),
      );
    }

    // 초대 상태 업데이트
    await invitationRepo.update(invitation.id, {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      userId: user.id,
    });

    // 토큰 발급
    const tokenPayload = {
      userId: user.id,
      companyId: invitation.companyId,
      role: user.role,
      canViewSensitive: user.canViewSensitive,
    };
    const accessToken = jwtService.generateAccessToken(tokenPayload);
    const refreshToken = jwtService.generateRefreshToken(tokenPayload);
    await userRepo.updateRefreshToken(invitation.companyId, user.id, refreshToken);

    const response = NextResponse.json({
      user: {
        id: user.id,
        companyId: invitation.companyId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, { status: 201 });

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
  } catch {
    return errorResponse('합류 처리 중 오류가 발생했습니다.', 500);
  }
}
