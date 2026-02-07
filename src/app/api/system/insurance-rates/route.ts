import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, _auth: AuthContext) {
  const rates = await prisma.insuranceRate.findMany({
    orderBy: [{ type: 'asc' }, { effectiveStartDate: 'desc' }],
  });

  return successResponse({ items: rates });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const { type, employeeRate, employerRate, minBase, maxBase, effectiveStartDate, effectiveEndDate, description } = body;

  if (!type || employeeRate === undefined || employerRate === undefined || !effectiveStartDate || !effectiveEndDate) {
    return errorResponse('필수 항목을 모두 입력해주세요.', 400);
  }

  const rate = await prisma.insuranceRate.create({
    data: {
      type,
      employeeRate,
      employerRate,
      minBase: minBase ?? null,
      maxBase: maxBase ?? null,
      effectiveStartDate: new Date(effectiveStartDate),
      effectiveEndDate: new Date(effectiveEndDate),
      description: description ?? null,
    },
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'CREATE',
    entityType: 'InsuranceRate',
    entityId: rate.id,
    after: body as Record<string, unknown>,
  });

  return createdResponse(rate);
}

const wrappedGet = withRole('SYSTEM_ADMIN', handleGet);
const wrappedPost = withRole('SYSTEM_ADMIN', handlePost);
export const GET = wrappedGet as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrappedPost as (request: NextRequest) => Promise<NextResponse>;
