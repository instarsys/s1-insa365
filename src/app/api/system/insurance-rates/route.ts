import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { createInsuranceRateSchema } from '@/presentation/api/schemas';

async function handleGet(_request: NextRequest, _auth: AuthContext) {
  const rates = await getContainer().insuranceRateRepo.findAll();

  return successResponse({ items: rates });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const validation = validateBody(createInsuranceRateSchema, body);
  if (!validation.success) return validation.response;
  const { type, employeeRate, employerRate, minBase, maxBase, effectiveStartDate, effectiveEndDate, description } = validation.data;

  const rate = await getContainer().insuranceRateRepo.create({
    type,
    employeeRate,
    employerRate,
    minBase: minBase ?? null,
    maxBase: maxBase ?? null,
    effectiveStartDate: new Date(effectiveStartDate),
    effectiveEndDate: new Date(effectiveEndDate),
    description: description ?? null,
  });

  const { auditLogRepo } = getContainer();
  await auditLogRepo.create({
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
