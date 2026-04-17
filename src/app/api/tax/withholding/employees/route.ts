import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';
import { parseMonthParam, parseYearParam } from '@/presentation/api/taxQueryParams';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const yearParam = parseYearParam(url);
  if (yearParam.response) return yearParam.response;

  const monthParam = parseMonthParam(url);
  if (monthParam.response) return monthParam.response;

  const { getWithholdingEmployeesUseCase } = getContainer();
  const items = await getWithholdingEmployeesUseCase.execute(
    auth.companyId,
    yearParam.value,
    monthParam.value,
  );

  return successResponse({ items, year: yearParam.value, month: monthParam.value });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
