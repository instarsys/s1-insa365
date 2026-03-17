import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

type RouteContext = { params: Promise<{ id: string }> };

async function deleteHandler(request: NextRequest, auth: AuthContext) {
  try {
    const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
    const { crudCompanyHolidayUseCase } = getContainer();
    await crudCompanyHolidayUseCase.delete(auth.companyId, id);
    return successResponse({ success: true });
  } catch {
    return errorResponse('휴일 삭제 중 오류가 발생했습니다.', 500);
  }
}

export const DELETE = withRole('COMPANY_ADMIN', deleteHandler) as (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;
