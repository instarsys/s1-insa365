import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { userRepo } = getContainer();
  const user = await userRepo.findByIdAndCompanyForMe(auth.companyId, auth.userId);

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
    mustChangePassword: user.mustChangePassword ?? false,
    companyName: user.company.name,
    departmentName: user.department?.name ?? null,
    positionName: user.position?.name ?? null,
    profileImageUrl: user.profileImageUrl,
    joinDate: user.joinDate?.toISOString() ?? null,
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
