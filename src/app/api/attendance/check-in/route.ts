import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { latitude, longitude } = await request.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: {
        companyId: auth.companyId,
        userId: auth.userId,
        date: today,
        deletedAt: null,
      },
    });

    if (existing?.checkInTime) {
      return errorResponse('이미 출근 기록이 있습니다.', 400);
    }

    const now = new Date();

    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkInTime: now,
            checkInLatitude: latitude ?? null,
            checkInLongitude: longitude ?? null,
          },
        })
      : await prisma.attendance.create({
          data: {
            companyId: auth.companyId,
            userId: auth.userId,
            date: today,
            checkInTime: now,
            checkInLatitude: latitude ?? null,
            checkInLongitude: longitude ?? null,
            status: 'ON_TIME',
          },
        });

    return createdResponse(attendance);
  } catch {
    return errorResponse('출근 처리 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
