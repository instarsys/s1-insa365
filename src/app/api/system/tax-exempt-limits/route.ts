import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handleGet(request: NextRequest, _auth: AuthContext) {
  const url = new URL(request.url);
  const { year } = parseSearchParams(url);
  const targetYear = year ?? new Date().getFullYear();

  const limits = await getContainer().taxExemptLimitRepo.findByYear(targetYear);

  return successResponse({ year: targetYear, items: limits });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const { year, code, name, monthlyLimit, description } = body;

  if (!year || !code || !name || monthlyLimit === undefined) {
    return errorResponse('필수 항목을 모두 입력해주세요.', 400);
  }

  const limit = await getContainer().taxExemptLimitRepo.create({
    year, code, name, monthlyLimit, description: description ?? null,
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'CREATE',
    entityType: 'TaxExemptLimit',
    entityId: limit.id,
    after: body as Record<string, unknown>,
  });

  return createdResponse(limit);
}

const wrappedGet = withRole('SYSTEM_ADMIN', handleGet);
const wrappedPost = withRole('SYSTEM_ADMIN', handlePost);
export const GET = wrappedGet as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrappedPost as (request: NextRequest) => Promise<NextResponse>;
