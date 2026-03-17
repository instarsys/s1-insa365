import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { checkInSchema } from '@/presentation/api/schemas';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(checkInSchema, body);
    if (!validation.success) return validation.response;
    const { latitude, longitude } = validation.data;

    const { checkInAttendanceUseCase } = getContainer();
    const coords = latitude != null && longitude != null
      ? { latitude, longitude }
      : undefined;

    const result = await checkInAttendanceUseCase.execute(auth.companyId, auth.userId, coords);

    if (!result.gpsValidation?.allowed) {
      return errorResponse(result.gpsValidation?.warningMessage ?? 'GPS 반경 밖입니다.', 403);
    }

    return createdResponse({
      ...result.attendance,
      gpsValidation: result.gpsValidation,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '출근 처리 중 오류가 발생했습니다.';
    return errorResponse(message, message.includes('이미') ? 400 : 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
