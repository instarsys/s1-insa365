import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { encryptionService } from '@/infrastructure/encryption/EncryptionService';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import {
  successResponse,
  notFoundResponse,
  noContentResponse,
  validateBody,
} from '@/presentation/api/helpers';
import { updateEmployeeSchema } from '@/presentation/api/schemas';

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const user = await prisma.user.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
    include: {
      department: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
      workPolicy: { select: { id: true, name: true, startTime: true, endTime: true } },
      workLocation: { select: { id: true, name: true } },
      employeeSalaryItems: {
        where: { deletedAt: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!user) return notFoundResponse('직원');

  const { password: _pw, refreshToken: _rt, encryptedRrn, encryptedBankAccount, ...rest } = user;

  return successResponse({
    ...rest,
    hasRrn: !!encryptedRrn,
    hasBankAccount: !!encryptedBankAccount,
  });
}

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();
  const validation = validateBody(updateEmployeeSchema, body);
  if (!validation.success) return validation.response;

  const existing = await prisma.user.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!existing) return notFoundResponse('직원');

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

  // Remove fields that shouldn't be directly updated
  delete data.id;
  delete data.companyId;
  delete data.password;
  delete data.refreshToken;
  delete data.employeeNumber;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      employeeNumber: true,
      role: true,
      employeeStatus: true,
    },
  });

  await auditLogService.log({
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

  const existing = await prisma.user.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!existing) return notFoundResponse('직원');

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      employeeStatus: 'TERMINATED',
      resignDate: new Date(),
    },
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'DELETE',
    entityType: 'User',
    entityId: id,
    before: { name: existing.name, employeeStatus: existing.employeeStatus } as Record<string, string>,
    after: { employeeStatus: 'TERMINATED' },
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
