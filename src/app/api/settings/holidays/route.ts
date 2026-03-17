import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function getHandler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);

  const { crudCompanyHolidayUseCase } = getContainer();
  const holidays = await crudCompanyHolidayUseCase.list(auth.companyId, year);

  return successResponse({ year, items: holidays });
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();

    const { crudCompanyHolidayUseCase } = getContainer();

    // 단건 생성
    if (!Array.isArray(body)) {
      if (!body.date || !body.name) {
        return errorResponse('날짜와 이름은 필수입니다.', 400);
      }
      const holiday = await crudCompanyHolidayUseCase.create(auth.companyId, {
        date: new Date(body.date),
        name: body.name,
        type: body.type ?? 'COMPANY',
        isRecurring: body.isRecurring ?? false,
      });
      return successResponse(holiday);
    }

    // 벌크 생성
    const items = body.map((item: { date: string; name: string; type?: string; isRecurring?: boolean }) => ({
      date: new Date(item.date),
      name: item.name,
      type: item.type ?? 'NATIONAL',
      isRecurring: item.isRecurring ?? false,
    }));
    const count = await crudCompanyHolidayUseCase.bulkCreate(auth.companyId, items);
    return successResponse({ createdCount: count });
  } catch {
    return errorResponse('휴일 생성 중 오류가 발생했습니다.', 500);
  }
}

export const GET = withRole('COMPANY_ADMIN', getHandler) as (request: NextRequest) => Promise<NextResponse>;
export const POST = withRole('COMPANY_ADMIN', postHandler) as (request: NextRequest) => Promise<NextResponse>;
