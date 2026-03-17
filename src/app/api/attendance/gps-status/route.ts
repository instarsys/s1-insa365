import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const url = new URL(request.url);
    const latStr = url.searchParams.get('latitude');
    const lngStr = url.searchParams.get('longitude');

    const coords = latStr && lngStr
      ? { latitude: parseFloat(latStr), longitude: parseFloat(lngStr) }
      : undefined;

    const { getGpsStatusUseCase } = getContainer();
    const result = await getGpsStatusUseCase.execute(auth.companyId, auth.userId, coords);

    return successResponse(result);
  } catch {
    return errorResponse('GPS 상태 조회 중 오류가 발생했습니다.', 500);
  }
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
