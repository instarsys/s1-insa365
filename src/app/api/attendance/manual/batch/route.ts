import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse } from '@/presentation/api/helpers';
import { ValidationError, EntityNotFoundError } from '@/domain/errors';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const { batchManualAttendanceUseCase } = getContainer();
    const result = await batchManualAttendanceUseCase.execute(
      auth.companyId,
      auth.userId,
      body,
    );
    return createdResponse(result);
  } catch (err) {
    if (err instanceof ValidationError || err instanceof EntityNotFoundError) {
      return errorResponse(err.message, 400);
    }
    return errorResponse(
      err instanceof Error ? err.message : '근태 일괄 입력 중 오류가 발생했습니다.',
      500,
    );
  }
}

const wrapped = withAuth(handler);
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
