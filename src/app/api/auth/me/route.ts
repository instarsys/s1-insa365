import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const user = await prisma.user.findFirst({
    where: { id: auth.userId, companyId: auth.companyId, deletedAt: null },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      employeeNumber: true,
      employeeStatus: true,
      canViewSensitive: true,
      departmentId: true,
      positionId: true,
      profileImageUrl: true,
      department: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return notFoundResponse('사용자');
  }

  return successResponse({
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    employeeNumber: user.employeeNumber,
    employeeStatus: user.employeeStatus,
    canViewSensitive: user.canViewSensitive,
    companyName: user.company.name,
    departmentName: user.department?.name ?? null,
    positionName: user.position?.name ?? null,
    profileImageUrl: user.profileImageUrl,
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
