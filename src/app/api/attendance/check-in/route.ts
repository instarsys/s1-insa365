import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { checkInSchema } from '@/presentation/api/schemas';
import { isWorkDay, timeStringToDate } from '@/domain/services/AttendanceClassifier';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(checkInSchema, body);
    if (!validation.success) return validation.response;
    const { latitude, longitude } = validation.data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { attendanceRepo, employeeRepo, workPolicyRepo } = getContainer();

    const existing = await attendanceRepo.findByDate(auth.companyId, auth.userId, today);

    if (existing?.checkInTime) {
      return errorResponse('이미 출근 기록이 있습니다.', 400);
    }

    const now = new Date();

    // WorkPolicy 조회: 직원 배정 → 회사 기본
    const user = await employeeRepo.findById(auth.companyId, auth.userId);
    let workPolicy = user?.workPolicyId
      ? await workPolicyRepo.findById(auth.companyId, user.workPolicyId)
      : null;
    if (!workPolicy) {
      workPolicy = await workPolicyRepo.findDefault(auth.companyId);
    }

    // 지각 판정
    let status: 'ON_TIME' | 'LATE' = 'ON_TIME';
    if (workPolicy) {
      const lateGrace = workPolicy.lateGraceMinutes ?? 0;
      const policyStart = timeStringToDate(today, workPolicy.startTime);
      const lateThreshold = new Date(policyStart.getTime() + lateGrace * 60000);
      if (now > lateThreshold) {
        status = 'LATE';
      }
    }

    // 자동 휴일 판정
    const isHoliday = workPolicy ? !isWorkDay(today, workPolicy.workDays) : false;

    const attendance = existing
      ? await attendanceRepo.update(auth.companyId, existing.id, {
            checkInTime: now,
            checkInLatitude: latitude ?? null,
            checkInLongitude: longitude ?? null,
            status,
            isHoliday,
          })
      : await attendanceRepo.create(auth.companyId, {
            companyId: auth.companyId,
            userId: auth.userId,
            date: today,
            checkInTime: now,
            checkInLatitude: latitude ?? null,
            checkInLongitude: longitude ?? null,
            status,
            isHoliday,
          });

    return createdResponse(attendance);
  } catch {
    return errorResponse('출근 처리 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
