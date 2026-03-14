import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, _auth: AuthContext) {
  const wages = await getContainer().minimumWageRepo.findAll();

  return successResponse({ items: wages });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const { year, hourlyWage, monthlyWage, description } = body;

  if (!year || hourlyWage === undefined || monthlyWage === undefined) {
    return errorResponse('필수 항목을 모두 입력해주세요.', 400);
  }

  const existing = await getContainer().minimumWageRepo.findByYear(year);
  if (existing) return errorResponse('해당 연도의 최저임금이 이미 존재합니다.', 409);

  const wage = await getContainer().minimumWageRepo.create({
    year, hourlyWage, monthlyWage, description: description ?? null,
  });

  const { auditLogRepo } = getContainer();
  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'CREATE',
    entityType: 'MinimumWage',
    entityId: wage.id,
    after: body as Record<string, unknown>,
  });

  return createdResponse(wage);
}

const wrappedGet = withRole('SYSTEM_ADMIN', handleGet);
const wrappedPost = withRole('SYSTEM_ADMIN', handlePost);
export const GET = wrappedGet as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrappedPost as (request: NextRequest) => Promise<NextResponse>;
