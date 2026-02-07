import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, auth: AuthContext) {
  const positions = await prisma.position.findMany({
    where: { companyId: auth.companyId, deletedAt: null },
    orderBy: { level: 'desc' },
    include: { _count: { select: { users: { where: { deletedAt: null } } } } },
  });

  return successResponse({ items: positions });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const { name, level } = await request.json();

  if (!name) return errorResponse('직위명을 입력해주세요.', 400);

  const existing = await prisma.position.findFirst({
    where: { companyId: auth.companyId, name, deletedAt: null },
  });
  if (existing) return errorResponse('이미 존재하는 직위명입니다.', 409);

  const position = await prisma.position.create({
    data: {
      companyId: auth.companyId,
      name,
      level: level ?? 0,
    },
  });

  return createdResponse(position);
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'GET') return handleGet(request, auth);
  return handlePost(request, auth);
});
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
