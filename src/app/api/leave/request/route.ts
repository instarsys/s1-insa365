import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveRequestSchema } from '@/presentation/api/schemas';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(createLeaveRequestSchema, body);
    if (!validation.success) return validation.response;
    const { type, leaveTypeConfigId, startDate, endDate, days, reason } = validation.data;

    const { leaveRequestRepo, attendanceRepo } = getContainer();

    // 근태 중복 검사
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const existingAttendances = await attendanceRepo.findExistingByDateRange(auth.companyId, auth.userId, startDateObj, endDateObj);
    if (existingAttendances.length > 0) {
      const dates = existingAttendances.map((a: { date: Date }) => a.date.toISOString().slice(0, 10)).join(', ');
      return errorResponse(`해당 기간에 근태 기록이 존재하여 휴가를 신청할 수 없습니다. (근태 기록일: ${dates})`, 409);
    }

    const leaveRequest = await leaveRequestRepo.create(auth.companyId, {
      companyId: auth.companyId,
      userId: auth.userId,
      type,
      leaveTypeConfigId: leaveTypeConfigId ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days,
      reason: reason ?? null,
      status: 'PENDING',
    });

    return createdResponse(leaveRequest);
  } catch {
    return errorResponse('휴가 신청 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
