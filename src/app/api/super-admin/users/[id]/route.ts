import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, forbiddenResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'SYSTEM_ADMIN') return forbiddenResponse();

  // Extract id from URL path
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1];

  try {
    const body = await request.json();
    const { role, employeeStatus } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) return notFoundResponse('사용자');

    const updateData: Record<string, unknown> = {};
    if (role) updateData.role = role;
    if (employeeStatus) updateData.employeeStatus = employeeStatus;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return successResponse({
      id: updated.id,
      name: updated.name,
      role: updated.role,
      employeeStatus: updated.employeeStatus,
    });
  } catch (error) {
    console.error('[SUPER_ADMIN_USERS_UPDATE]', error);
    return errorResponse('사용자 수정에 실패했습니다.', 500);
  }
}

export const PUT = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
