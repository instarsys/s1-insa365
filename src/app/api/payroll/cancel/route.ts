import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';

import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { ValidationError } from '@domain/errors';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { year, month } = await request.json();

    if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

    const { cancelPayrollUseCase } = getContainer();
    const result = await cancelPayrollUseCase.execute(auth.companyId, year, month, auth.userId);

    return successResponse(result);
  } catch (err) {
    const status = err instanceof ValidationError ? 400 : 500;
    return errorResponse(err instanceof Error ? err.message : '급여 취소 중 오류가 발생했습니다.', status);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
