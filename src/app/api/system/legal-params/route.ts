import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(request: NextRequest, _auth: AuthContext) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');

  const params = category
    ? await getContainer().legalParameterRepo.findByCategory(category)
    : await getContainer().legalParameterRepo.findAll();

  return successResponse({ items: params });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const { category, key, value, description, unit } = body;

  if (!category || !key || value === undefined) {
    return errorResponse('필수 항목을 모두 입력해주세요.', 400);
  }

  const existing = await getContainer().legalParameterRepo.findByKey(key);
  if (existing) return errorResponse('이미 존재하는 키입니다.', 409);

  const param = await getContainer().legalParameterRepo.create({
    category, key, value: String(value), description: description ?? null, unit: unit ?? null,
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'CREATE',
    entityType: 'LegalParameter',
    entityId: param.id,
    after: body as Record<string, unknown>,
  });

  return createdResponse(param);
}

const wrappedGet = withRole('SYSTEM_ADMIN', handleGet);
const wrappedPost = withRole('SYSTEM_ADMIN', handlePost);
export const GET = wrappedGet as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrappedPost as (request: NextRequest) => Promise<NextResponse>;
