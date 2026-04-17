import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';
import { parseYearParam } from '@/presentation/api/taxQueryParams';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const yearParam = parseYearParam(url);
  if (yearParam.response) return yearParam.response;

  const { getAnnualTaxSummaryUseCase } = getContainer();
  const result = await getAnnualTaxSummaryUseCase.execute(auth.companyId, yearParam.value);

  return successResponse(result);
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
