import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import {
  successResponse,
  notFoundResponse,
  noContentResponse,
  errorResponse,
  validateBody,
} from '@/presentation/api/helpers';
import { updateEmployeeSchema } from '@/presentation/api/schemas';

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { employeeRepo, encryptionService } = getContainer();
  const user = await employeeRepo.findByIdWithDetails(auth.companyId, id);

  if (!user) return notFoundResponse('직원');

  const { password: _pw, refreshToken: _rt, encryptedRrn, encryptedBankAccount, ...rest } = user;

  let rrn: string | null = null;
  let bankAccount: string | null = null;

  if (auth.canViewSensitive) {
    if (encryptedRrn) rrn = encryptionService.decrypt(encryptedRrn);
    if (encryptedBankAccount) bankAccount = encryptionService.decrypt(encryptedBankAccount);
  }

  return successResponse({
    ...rest,
    hasRrn: !!encryptedRrn,
    hasBankAccount: !!encryptedBankAccount,
    rrn,
    bankAccount,
  });
}

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();
  const validation = validateBody(updateEmployeeSchema, body);
  if (!validation.success) return validation.response;

  const { employeeRepo, auditLogRepo, encryptionService } = getContainer();

  const existing = await employeeRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('직원');

  // 시급제+근태면제 동시 설정 방어: DB 기존값 포함 effective 검증 + 자동 해제
  const effectiveSalaryType = validation.data.salaryType ?? existing.salaryType;
  const effectiveAttendanceExempt = validation.data.attendanceExempt ?? existing.attendanceExempt;
  if (effectiveSalaryType === 'HOURLY' && effectiveAttendanceExempt) {
    validation.data.attendanceExempt = false;
  }

  const { rrn, bankAccount, bankName, ...updateData } = validation.data;

  const data: Record<string, unknown> = { ...updateData };
  if (rrn !== undefined) {
    data.encryptedRrn = rrn ? encryptionService.encrypt(rrn) : null;
  }
  if (bankAccount !== undefined) {
    data.encryptedBankAccount = bankAccount ? encryptionService.encrypt(bankAccount) : null;
  }
  if (bankName !== undefined) {
    data.bankName = bankName;
  }
  if (data.joinDate) data.joinDate = new Date(data.joinDate as string);
  if (data.resignDate) data.resignDate = new Date(data.resignDate as string);
  if (data.leaveStartDate) data.leaveStartDate = new Date(data.leaveStartDate as string);
  if (data.leaveEndDate) data.leaveEndDate = new Date(data.leaveEndDate as string);

  // Remove fields that shouldn't be directly updated
  delete data.id;
  delete data.companyId;
  delete data.password;
  delete data.refreshToken;
  delete data.employeeNumber;

  const updatedFull = await employeeRepo.update(auth.companyId, id, data);
  const updated = updatedFull ? {
    id: updatedFull.id,
    name: updatedFull.name,
    email: updatedFull.email,
    employeeNumber: updatedFull.employeeNumber,
    role: updatedFull.role,
    employeeStatus: updatedFull.employeeStatus,
  } : null;

  if (!updated) return notFoundResponse('직원');

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    before: { name: existing.name, email: existing.email },
    after: updateData as Record<string, string>,
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json().catch(() => ({}));

  const { terminateEmployeeUseCase, employeeRepo, auditLogRepo } = getContainer();

  const existing = await employeeRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('직원');

  await terminateEmployeeUseCase.execute(auth.companyId, id, {
    resignDate: body.resignDate || new Date().toISOString(),
    resignReason: body.resignReason,
  });

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'DELETE',
    entityType: 'User',
    entityId: id,
    before: { name: existing.name, employeeStatus: existing.employeeStatus } as Record<string, string>,
    after: { employeeStatus: 'RESIGNED' },
  });

  return noContentResponse();
}

// We need to handle the route context manually since withAuth doesn't pass it
function createHandler(method: 'GET' | 'PUT' | 'DELETE') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    // Attach routeContext to request for inner handlers
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { GET: handleGet, PUT: handlePut, DELETE: handleDelete };
    const wrapped = withAuth(methods[method]);
    return wrapped(request, routeContext);
  };
}

export const GET = createHandler('GET') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const PUT = createHandler('PUT') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createHandler('DELETE') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
