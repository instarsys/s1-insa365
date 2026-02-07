import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handleGet(request: NextRequest, _auth: AuthContext) {
  const url = new URL(request.url);
  const { year } = parseSearchParams(url);
  const targetYear = year ?? new Date().getFullYear();

  const brackets = await prisma.taxBracket.findMany({
    where: { year: targetYear },
    orderBy: [{ dependents: 'asc' }, { minIncome: 'asc' }],
  });

  return successResponse({ year: targetYear, items: brackets });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const { year, minIncome, maxIncome, dependents, taxAmount } = body;

  if (!year || minIncome === undefined || maxIncome === undefined || dependents === undefined || taxAmount === undefined) {
    return errorResponse('필수 항목을 모두 입력해주세요.', 400);
  }

  const bracket = await prisma.taxBracket.create({
    data: { year, minIncome, maxIncome, dependents, taxAmount },
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'CREATE',
    entityType: 'TaxBracket',
    entityId: bracket.id,
    after: body as Record<string, unknown>,
  });

  return createdResponse(bracket);
}

const wrappedGet = withRole('SYSTEM_ADMIN', handleGet);
const wrappedPost = withRole('SYSTEM_ADMIN', handlePost);
export const GET = wrappedGet as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrappedPost as (request: NextRequest) => Promise<NextResponse>;
