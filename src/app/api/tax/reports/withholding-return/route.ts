import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { parseMonthParam, parseYearParam } from '@/presentation/api/taxQueryParams';
import { ValidationError } from '@/domain/errors';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const yearParam = parseYearParam(url);
  if (yearParam.response) return yearParam.response;
  const monthParam = parseMonthParam(url);
  if (monthParam.response) return monthParam.response;

  try {
    const { getWithholdingReturnUseCase } = getContainer();
    const result = await getWithholdingReturnUseCase.execute(
      auth.companyId,
      yearParam.value,
      monthParam.value,
    );
    return successResponse(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(err.message, 400);
    }
    throw err;
  }
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
