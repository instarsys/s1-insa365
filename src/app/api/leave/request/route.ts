import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveRequestSchema } from '@/presentation/api/schemas';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(createLeaveRequestSchema, body);
    if (!validation.success) return validation.response;
    const { type, leaveTypeConfigId, startDate, endDate, days, reason } = validation.data;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        companyId: auth.companyId,
        userId: auth.userId,
        type,
        leaveTypeConfigId: leaveTypeConfigId ?? null,
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
