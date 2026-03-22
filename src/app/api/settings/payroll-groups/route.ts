import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { withPermission } from '@/presentation/middleware/withPermission';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function getHandler(_request: NextRequest, auth: AuthContext) {
  const { crudPayrollGroupUseCase } = getContainer();
  const groups = await crudPayrollGroupUseCase.list(auth.companyId);
  return successResponse({ items: groups });
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const { crudPayrollGroupUseCase } = getContainer();
    const group = await crudPayrollGroupUseCase.create(auth.companyId, {
      name: body.name,
      code: body.code,
      payDay: body.payDay,
      description: body.description,
      sortOrder: body.sortOrder,
    });
    return successResponse(group);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return errorResponse('동일한 이름의 급여 그룹이 이미 존재합니다.', 409);
    }
    return errorResponse(err instanceof Error ? err.message : '급여 그룹 생성에 실패했습니다.', 400);
  }
}

export const GET = withPermission('GROUP_MGMT', 'VIEW_ALL', getHandler) as (request: NextRequest) => Promise<NextResponse>;
export const POST = withRole('COMPANY_ADMIN', postHandler) as (request: NextRequest) => Promise<NextResponse>;
