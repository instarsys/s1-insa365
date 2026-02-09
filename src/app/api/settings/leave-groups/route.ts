import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { withRole } from '@/presentation/middleware/withRole';
import { successResponse, createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveGroupSchema } from '@/presentation/api/schemas';
import { getContainer } from '@/infrastructure/di/container';

async function getHandler(_request: NextRequest, auth: AuthContext) {
  try {
    const { leaveGroupRepo } = getContainer();
    const items = await leaveGroupRepo.findAll(auth.companyId);

    return successResponse({ items });
  } catch (err) {
    console.error('[leave-groups GET]', err);
    return errorResponse('휴가 그룹 조회 중 오류가 발생했습니다.', 500);
  }
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(createLeaveGroupSchema, body);
    if (!validation.success) return validation.response;
    const { name, allowOveruse, description, sortOrder } = validation.data;

    const { leaveGroupRepo } = getContainer();
    const existing = await leaveGroupRepo.findByName(auth.companyId, name);
    if (existing) return errorResponse('이미 존재하는 그룹명입니다.', 409);

    const group = await leaveGroupRepo.create(auth.companyId, {
      name,
      allowOveruse,
      description: description ?? null,
      sortOrder,
    });

    return createdResponse(group);
  } catch {
    return errorResponse('휴가 그룹 생성 중 오류가 발생했습니다.', 500);
  }
}

export const GET = withAuth(getHandler) as (request: NextRequest) => Promise<NextResponse>;
export const POST = withRole('COMPANY_ADMIN', postHandler) as (request: NextRequest) => Promise<NextResponse>;
