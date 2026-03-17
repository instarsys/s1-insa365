import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { latitude, longitude } = await request.json();

    const { checkOutAttendanceUseCase } = getContainer();
    const coords = latitude != null && longitude != null
      ? { latitude, longitude }
      : undefined;

    const result = await checkOutAttendanceUseCase.execute(auth.companyId, auth.userId, coords);

    if (!result.gpsValidation?.allowed) {
      return errorResponse(result.gpsValidation?.warningMessage ?? 'GPS 반경 밖입니다.', 403);
    }

    return successResponse({
      ...result.attendance,
      gpsValidation: result.gpsValidation,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '퇴근 처리 중 오류가 발생했습니다.';
    const status = message.includes('출근 기록이 없습니다') || message.includes('이미') ? 400 : 500;
    return errorResponse(message, status);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
