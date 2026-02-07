import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { type, startDate, endDate, days, reason } = await request.json();

    if (!type || !startDate || !endDate || days === undefined) {
      return errorResponse('휴가 유형, 시작일, 종료일, 일수를 입력해주세요.', 400);
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        companyId: auth.companyId,
        userId: auth.userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days,
        reason: reason ?? null,
        status: 'PENDING',
      },
    });

    return createdResponse(leaveRequest);
  } catch {
    return errorResponse('휴가 신청 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
