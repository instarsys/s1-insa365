import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, auth: AuthContext) {
  const { departmentRepo } = getContainer();
  const departments = await departmentRepo.findAllWithUserCount(auth.companyId);

  return successResponse({ items: departments });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const { name, code, parentId, sortOrder } = await request.json();

  if (!name) return errorResponse('부서명을 입력해주세요.', 400);

  const { departmentRepo } = getContainer();

  const existing = await departmentRepo.findByName(auth.companyId, name);
  if (existing) return errorResponse('이미 존재하는 부서명입니다.', 409);

  const department = await departmentRepo.create(auth.companyId, {
    companyId: auth.companyId,
    name,
    code: code ?? null,
    parentId: parentId ?? null,
    sortOrder: sortOrder ?? 0,
  });

  return createdResponse(department);
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'GET') return handleGet(request, auth);
  return handlePost(request, auth);
});
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
