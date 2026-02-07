import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, auth: AuthContext) {
  const departments = await prisma.department.findMany({
    where: { companyId: auth.companyId, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { users: { where: { deletedAt: null } } } } },
  });

  return successResponse({ items: departments });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  const { name, code, parentId, sortOrder } = await request.json();

  if (!name) return errorResponse('부서명을 입력해주세요.', 400);

  const existing = await prisma.department.findFirst({
    where: { companyId: auth.companyId, name, deletedAt: null },
  });
  if (existing) return errorResponse('이미 존재하는 부서명입니다.', 409);

  const department = await prisma.department.create({
    data: {
      companyId: auth.companyId,
      name,
      code: code ?? null,
      parentId: parentId ?? null,
      sortOrder: sortOrder ?? 0,
    },
  });

  return createdResponse(department);
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'GET') return handleGet(request, auth);
  return handlePost(request, auth);
});
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
