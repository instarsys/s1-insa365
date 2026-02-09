import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, auth: AuthContext) {
  const positions = await getContainer().positionRepo.findAllWithUserCount(auth.companyId);

  return successResponse({ items: positions });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const { name, level } = await request.json();

  if (!name) return errorResponse('직위명을 입력해주세요.', 400);

  const { positionRepo } = getContainer();

  const existing = await positionRepo.findByName(auth.companyId, name);
  if (existing) return errorResponse('이미 존재하는 직위명입니다.', 409);

  const position = await positionRepo.create(auth.companyId, {
    companyId: auth.companyId,
    name,
    level: level ?? 0,
  });

  return createdResponse(position);
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'GET') return handleGet(request, auth);
  return handlePost(request, auth);
});
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
