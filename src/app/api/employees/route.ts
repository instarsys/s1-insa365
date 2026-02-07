import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { passwordService } from '@/infrastructure/auth/PasswordService';
import { encryptionService } from '@/infrastructure/encryption/EncryptionService';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import {
  successResponse,
  createdResponse,
  errorResponse,
  parseSearchParams,
} from '@/presentation/api/helpers';

async function handleGet(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit, search, departmentId, status } = parseSearchParams(url);
  const skip = (page - 1) * limit;

  const where = {
    companyId: auth.companyId,
    deletedAt: null,
    ...(departmentId && { departmentId }),
    ...(status && { employeeStatus: status as 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED' }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { employeeNumber: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [employees, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        employeeStatus: true,
        joinDate: true,
        resignDate: true,
        departmentId: true,
        positionId: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return successResponse({
    items: employees,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const { name, email, password, phone, role, departmentId, positionId, workPolicyId, workLocationId, joinDate, dependents, rrn, bankAccount, bankName } = body;

    if (!name || !email || !password) {
      return errorResponse('이름, 이메일, 비밀번호는 필수입니다.', 400);
    }

    const existing = await prisma.user.findFirst({
      where: { companyId: auth.companyId, email, deletedAt: null },
    });
    if (existing) {
      return errorResponse('이미 사용 중인 이메일입니다.', 409);
    }

    // Generate employee number
    const lastEmployee = await prisma.user.findFirst({
      where: { companyId: auth.companyId },
      orderBy: { createdAt: 'desc' },
      select: { employeeNumber: true },
    });

    let nextNumber = 1;
    if (lastEmployee?.employeeNumber) {
      const match = lastEmployee.employeeNumber.match(/\d+$/);
      if (match) nextNumber = parseInt(match[0], 10) + 1;
    }
    const employeeNumber = `EA${nextNumber.toString().padStart(4, '0')}`;

    const hashedPassword = await passwordService.hash(password);

    const user = await prisma.user.create({
      data: {
        companyId: auth.companyId,
        name,
        email,
        password: hashedPassword,
        phone: phone ?? null,
        role: role ?? 'EMPLOYEE',
        employeeNumber,
        departmentId: departmentId ?? null,
        positionId: positionId ?? null,
        workPolicyId: workPolicyId ?? null,
        workLocationId: workLocationId ?? null,
        joinDate: joinDate ? new Date(joinDate) : null,
        dependents: dependents ?? 1,
        encryptedRrn: rrn ? encryptionService.encrypt(rrn) : null,
        encryptedBankAccount: bankAccount ? encryptionService.encrypt(bankAccount) : null,
        bankName: bankName ?? null,
      },
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        email: true,
        role: true,
        employeeStatus: true,
      },
    });

    // Copy salary rules to employee salary items
    const salaryRules = await prisma.salaryRule.findMany({
      where: { companyId: auth.companyId, isActive: true, deletedAt: null },
    });

    if (salaryRules.length > 0) {
      await prisma.employeeSalaryItem.createMany({
        data: salaryRules.map((rule) => ({
          companyId: auth.companyId,
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
      });
    }

    await auditLogService.log({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      after: { name, email, role: role ?? 'EMPLOYEE', employeeNumber } as Record<string, string>,
    });

    return createdResponse(user);
  } catch {
    return errorResponse('직원 생성 중 오류가 발생했습니다.', 500);
  }
}

async function handler(request: NextRequest, auth: AuthContext) {
  if (request.method === 'GET') return handleGet(request, auth);
  if (request.method === 'POST') return handlePost(request, auth);
  return errorResponse('Method not allowed', 405);
}

const wrapped = withAuth(handler);
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
