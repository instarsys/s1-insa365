import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';
import { getKoreanHolidays } from '@/domain/services/KoreanHolidays';

async function postHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const year = body.year;

    if (!year || typeof year !== 'number') {
      return errorResponse('연도를 지정해주세요.', 400);
    }

    const holidays = getKoreanHolidays(year);
    if (holidays.length === 0) {
      return errorResponse(`${year}년 공휴일 데이터가 없습니다.`, 400);
    }

    const { crudCompanyHolidayUseCase } = getContainer();
    const items = holidays.map((h) => ({
      date: new Date(h.date),
      name: h.name,
      type: 'NATIONAL' as const,
      isRecurring: h.isRecurring,
    }));

    const count = await crudCompanyHolidayUseCase.bulkCreate(auth.companyId, items);
    return successResponse({ year, importedCount: count });
  } catch {
    return errorResponse('공휴일 불러오기 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', postHandler) as (request: NextRequest) => Promise<NextResponse>;
