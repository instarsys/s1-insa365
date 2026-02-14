import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { passwordService } from '@/infrastructure/auth/PasswordService';
import { encryptionService } from '@/infrastructure/encryption/EncryptionService';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import {
  successResponse,
  createdResponse,
  errorResponse,
  parseSearchParams,
  validateBody,
} from '@/presentation/api/helpers';
import { createEmployeeSchema } from '@/presentation/api/schemas';

async function handleGet(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit, search, departmentId, status } = parseSearchParams(url);

  const { employeeRepo } = getContainer();
  const result = await employeeRepo.findAll(auth.companyId, { search, departmentId, status, page, limit });

  return successResponse({
    items: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: Math.ceil(result.total / result.limit),
  });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(createEmployeeSchema, body);
    if (!validation.success) return validation.response;
    const { name, email, password, phone, role, departmentId, positionId, workPolicyId, workLocationId, joinDate, dependents, rrn, bankAccount, bankName, address, isHouseholder, hireType } = validation.data;

    const { employeeRepo, salaryRuleRepo, employeeSalaryItemRepo } = getContainer();

    const existing = await employeeRepo.findByEmail(auth.companyId, email);
    if (existing) {
      return errorResponse('이미 사용 중인 이메일입니다.', 409);
    }

    // Generate employee number
    const employeeNumber = await employeeRepo.getNextEmployeeNumber(auth.companyId, 'A');

    const hashedPassword = await passwordService.hash(password);

    const created = await employeeRepo.createUnchecked(auth.companyId, {
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
      address: address ?? null,
      isHouseholder: isHouseholder ?? false,
      hireType: hireType ?? null,
    });
    const user = {
      id: created.id,
      employeeNumber: created.employeeNumber,
      name: created.name,
      email: created.email,
      role: created.role,
      employeeStatus: created.employeeStatus,
    };

    // Copy salary rules to employee salary items
    const salaryRules = await salaryRuleRepo.findAll(auth.companyId);
    const activeRules = salaryRules.filter((rule) => rule.isActive);

    if (activeRules.length > 0) {
      await employeeSalaryItemRepo.createMany(
        activeRules.map((rule) => ({
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
      );
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
