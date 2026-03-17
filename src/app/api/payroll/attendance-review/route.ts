import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const yearStr = url.searchParams.get('year');
  const monthStr = url.searchParams.get('month');

  if (!yearStr || !monthStr) return errorResponse('연도와 월을 지정해주세요.', 400);

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const { getAttendanceReviewUseCase } = getContainer();
  const result = await getAttendanceReviewUseCase.execute(auth.companyId, year, month);

  return successResponse(result);
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
