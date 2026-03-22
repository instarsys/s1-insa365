import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { signupSchema } from '@/presentation/api/schemas';
import { rateLimit, getClientIp } from '@/presentation/middleware/rateLimit';
import { DEFAULT_MANAGER_PERMISSIONS } from '@domain/value-objects/Permission';

export async function POST(request: NextRequest) {
  const rateLimited = rateLimit(`signup:${getClientIp(request.headers)}`, 3, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const validation = validateBody(signupSchema, body);
    if (!validation.success) return validation.response;
    const { companyName, businessNumber, representativeName, employeeCountRange, name, email, password, termsAgreed, privacyAgreed, marketingAgreed } = validation.data;

    const { userRepo, companyRepo, jwtService, passwordService } = getContainer();

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      return errorResponse('이미 사용 중인 이메일입니다.', 409);
    }

    const existingCompany = await companyRepo.findByBusinessNumber(businessNumber);
    if (existingCompany) {
      return errorResponse('이미 등록된 사업자등록번호입니다.', 409);
    }

    const hashedPassword = await passwordService.hash(password);

    // Complex transaction with multiple models — use prisma directly
    const { prisma } = await import('@/infrastructure/persistence/prisma/client');
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          businessNumber,
          representativeName,
          employeeCountRange: employeeCountRange || null,
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email,
          password: hashedPassword,
          name,
          role: 'COMPANY_ADMIN',
          canViewSensitive: true,
          employeeNumber: 'EA0001',
          employeeStatus: 'ACTIVE',
        },
      });

      // Seed departments
      const deptNames = ['경영지원', '인사팀', '개발팀', '영업팀', '마케팅팀'];
      for (let i = 0; i < deptNames.length; i++) {
        await tx.department.create({
          data: { companyId: company.id, name: deptNames[i], sortOrder: i + 1 },
        });
      }

      // Seed positions
      const posNames = ['대표이사', '이사', '부장', '과장', '사원'];
      for (let i = 0; i < posNames.length; i++) {
        await tx.position.create({
          data: { companyId: company.id, name: posNames[i], level: posNames.length - i },
        });
      }

      // Seed default work policy
      await tx.workPolicy.create({
        data: {
          companyId: company.id,
          name: '기본 근무',
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          workDays: '1,2,3,4,5',
          isDefault: true,
        },
      });

      // Seed default work location
      await tx.workLocation.create({
        data: {
          companyId: company.id,
          name: '본사',
          address: '서울특별시',
          isDefault: true,
        },
      });

      // Seed salary rules (allowances A01-A11)
      const allowanceRules = [
        { code: 'A01', name: '기본급', type: 'BASE' as const, isOrdinaryWage: true },
        { code: 'A02', name: '식대', type: 'ALLOWANCE' as const, isTaxExempt: true, taxExemptCode: 'MEALS', defaultAmount: 200000 },
        { code: 'A03', name: '차량유지비', type: 'ALLOWANCE' as const, isTaxExempt: true, taxExemptCode: 'VEHICLE', defaultAmount: 200000 },
        { code: 'A04', name: '보육수당', type: 'ALLOWANCE' as const, isTaxExempt: true, taxExemptCode: 'CHILDCARE' },
        { code: 'A05', name: '직책수당', type: 'ALLOWANCE' as const, isOrdinaryWage: true },
        { code: 'A06', name: '자격수당', type: 'ALLOWANCE' as const, isOrdinaryWage: true },
        { code: 'A07', name: '가족수당', type: 'ALLOWANCE' as const, isOrdinaryWage: true },
        { code: 'A08', name: '연장근로수당', type: 'ALLOWANCE' as const, paymentType: 'FORMULA' as const },
        { code: 'A09', name: '야간근로수당', type: 'ALLOWANCE' as const, paymentType: 'FORMULA' as const },
        { code: 'A10', name: '휴일근로수당', type: 'ALLOWANCE' as const, paymentType: 'FORMULA' as const },
        { code: 'A11', name: '상여금', type: 'ALLOWANCE' as const, paymentType: 'VARIABLE' as const },
      ];

      for (let i = 0; i < allowanceRules.length; i++) {
        const rule = allowanceRules[i];
        await tx.salaryRule.create({
          data: {
            companyId: company.id,
            code: rule.code,
            name: rule.name,
            type: rule.type,
            paymentType: rule.paymentType ?? 'FIXED',
            isOrdinaryWage: rule.isOrdinaryWage ?? false,
            isTaxExempt: rule.isTaxExempt ?? false,
            taxExemptCode: rule.taxExemptCode ?? null,
            defaultAmount: rule.defaultAmount ?? null,
            sortOrder: i + 1,
          },
        });
      }

      // Seed deduction rules (D01-D12)
      const deductionRules = [
        { code: 'D01', name: '국민연금' },
        { code: 'D02', name: '건강보험' },
        { code: 'D03', name: '장기요양보험' },
        { code: 'D04', name: '고용보험' },
        { code: 'D05', name: '소득세' },
        { code: 'D06', name: '지방소득세' },
        { code: 'D07', name: '학자금대출' },
        { code: 'D08', name: '노조비' },
        { code: 'D09', name: '기숙사비' },
        { code: 'D10', name: '사내대출상환' },
        { code: 'D11', name: '기타공제1' },
        { code: 'D12', name: '기타공제2' },
      ];

      const SYSTEM_MANAGED_CODES = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06'];
      for (let i = 0; i < deductionRules.length; i++) {
        await tx.salaryRule.create({
          data: {
            companyId: company.id,
            code: deductionRules[i].code,
            name: deductionRules[i].name,
            type: 'DEDUCTION',
            sortOrder: i + 1,
            isSystemManaged: SYSTEM_MANAGED_CODES.includes(deductionRules[i].code),
          },
        });
      }

      // Terms agreement
      await tx.termsAgreement.create({
        data: {
          companyId: company.id,
          userId: user.id,
          termsAgreed,
          privacyAgreed,
          marketingAgreed: marketingAgreed ?? false,
        },
      });

      // Seed default payroll group + assign admin
      const defaultGroup = await tx.payrollGroup.create({
        data: {
          companyId: company.id,
          name: '기본 그룹',
          code: 'G01',
          payDay: 25,
          isDefault: true,
          sortOrder: 0,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { payrollGroupId: defaultGroup.id },
      });

      // Seed default MANAGER role permissions
      const permRecords: { companyId: string; role: 'MANAGER'; category: string; permission: string; enabled: boolean }[] = [];
      for (const [category, perms] of Object.entries(DEFAULT_MANAGER_PERMISSIONS)) {
        for (const [permission, enabled] of Object.entries(perms)) {
          permRecords.push({ companyId: company.id, role: 'MANAGER', category, permission, enabled });
        }
      }
      await tx.rolePermission.createMany({ data: permRecords });

      return { company, user };
    });

    const tokenPayload = {
      userId: result.user.id,
      companyId: result.company.id,
      role: result.user.role,
      canViewSensitive: result.user.canViewSensitive,
    };

    const accessToken = jwtService.generateAccessToken(tokenPayload);
    const refreshToken = jwtService.generateRefreshToken(tokenPayload);

    await userRepo.updateRefreshToken(result.company.id, result.user.id, refreshToken);

    const response = createdResponse({
      user: {
        id: result.user.id,
        companyId: result.company.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        employeeNumber: result.user.employeeNumber,
        canViewSensitive: result.user.canViewSensitive,
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
    response.cookies.set('user_role', result.user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 604800,
      path: '/',
    });

    return response;
  } catch {
    return errorResponse('회원가입 처리 중 오류가 발생했습니다.', 500);
  }
}
