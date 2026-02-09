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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { attendanceRepo } = getContainer();

    const existing = await attendanceRepo.findByDate(auth.companyId, auth.userId, today);

    if (existing?.checkInTime) {
      return errorResponse('이미 출근 기록이 있습니다.', 400);
    }

    const now = new Date();

    const attendance = existing
      ? await attendanceRepo.update(auth.companyId, existing.id, {
            checkInTime: now,
            checkInLatitude: latitude ?? null,
            checkInLongitude: longitude ?? null,
          })
      : await attendanceRepo.create(auth.companyId, {
            companyId: auth.companyId,
            userId: auth.userId,
            date: today,
            checkInTime: now,
            checkInLatitude: latitude ?? null,
            checkInLongitude: longitude ?? null,
            status: 'ON_TIME',
          });

    return createdResponse(attendance);
  } catch {
    return errorResponse('출근 처리 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
