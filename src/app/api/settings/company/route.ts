import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, auth: AuthContext) {
  const company = await getContainer().companyRepo.findById(auth.companyId);

  if (!company) return notFoundResponse('회사');

  return successResponse(company);
}

async function handlePut(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'SYSTEM_ADMIN') {
    return errorResponse('권한이 없습니다.', 403);
  }

  const body = await request.json();
  const allowedFields = [
    'name', 'businessNumber', 'representativeName', 'address', 'phone', 'email',
    'payDay', 'monthlyWorkHours', 'lateGraceMinutes', 'earlyLeaveGraceMinutes',
    'nightWorkStartTime', 'nightWorkEndTime', 'overtimeThresholdMinutes', 'prorationMethod',
  ] as const;

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  const { companyRepo, auditLogRepo } = getContainer();
  const existing = await companyRepo.findById(auth.companyId);

  const updated = await companyRepo.update(auth.companyId, updateData);

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'Company',
    entityId: auth.companyId,
    before: existing as unknown as Record<string, unknown>,
    after: updateData,
  });

  return successResponse(updated);
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'GET') return handleGet(request, auth);
  return handlePut(request, auth);
});
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const PUT = wrapped as (request: NextRequest) => Promise<NextResponse>;
