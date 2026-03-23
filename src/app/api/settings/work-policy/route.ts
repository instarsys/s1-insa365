import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handleGet(_request: NextRequest, auth: AuthContext) {
  const policies = await getContainer().workPolicyRepo.findAllWithUserCount(auth.companyId);

  return successResponse({ items: policies });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'SYSTEM_ADMIN') {
    return errorResponse('권한이 없습니다.', 403);
  }

  const body = await request.json();
  const { name, startTime, endTime, breakMinutes, workDays, isDefault,
    lateGraceMinutes, earlyLeaveGraceMinutes,
    nightWorkStartTime, nightWorkEndTime, overtimeThresholdMinutes,
    monthlyWorkHours, weeklyHoliday, weeklyWorkHours,
    weeklyOvertimeLimit, monthlyOvertimeLimit,
    checkInAllowedMinutes, checkOutAllowedMinutes,
    overtimeMinThreshold, overtimeRoundingMinutes,
    breakType, breakSchedule, attendanceCalcMode } = body;

  if (!name || !startTime || !endTime) {
    return errorResponse('이름, 시작시간, 종료시간은 필수입니다.', 400);
  }

  if (isDefault) {
    await getContainer().workPolicyRepo.unsetDefault(auth.companyId);
  }

  const policy = await getContainer().workPolicyRepo.create(auth.companyId, {
    name,
    startTime,
    endTime,
    breakMinutes: breakMinutes ?? 60,
    workDays: workDays ?? '1,2,3,4,5',
    isDefault: isDefault ?? false,
    lateGraceMinutes,
    earlyLeaveGraceMinutes,
    nightWorkStartTime,
    nightWorkEndTime,
    overtimeThresholdMinutes,
    monthlyWorkHours,
    weeklyHoliday,
    weeklyWorkHours,
    weeklyOvertimeLimit,
    monthlyOvertimeLimit,
    checkInAllowedMinutes,
    checkOutAllowedMinutes,
    overtimeMinThreshold,
    overtimeRoundingMinutes,
    breakType,
    breakSchedule,
    attendanceCalcMode,
  });

  return createdResponse(policy);
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'GET') return handleGet(request, auth);
  return handlePost(request, auth);
});
export const GET = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
