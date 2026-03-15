import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { AttendanceClassifier, isWorkDay } from '@/domain/services/AttendanceClassifier';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { latitude, longitude } = await request.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { attendanceRepo, employeeRepo, workPolicyRepo } = getContainer();

    const attendance = await attendanceRepo.findByDate(auth.companyId, auth.userId, today);

    if (!attendance) {
      return errorResponse('출근 기록이 없습니다. 먼저 출근해주세요.', 400);
    }

    if (attendance.checkOutTime) {
      return errorResponse('이미 퇴근 기록이 있습니다.', 400);
    }

    const now = new Date();

    // WorkPolicy 조회
    const user = await employeeRepo.findById(auth.companyId, auth.userId);
    let workPolicy = user?.workPolicyId
      ? await workPolicyRepo.findById(auth.companyId, user.workPolicyId)
      : null;
    if (!workPolicy) {
      workPolicy = await workPolicyRepo.findDefault(auth.companyId);
    }

    let updateData: Record<string, unknown> = {
      checkOutTime: now,
      checkOutLatitude: latitude ?? null,
      checkOutLongitude: longitude ?? null,
    };

    if (attendance.checkInTime && workPolicy) {
      const isHoliday = attendance.isHoliday || !isWorkDay(today, workPolicy.workDays);

      const result = AttendanceClassifier.classify({
        checkInTime: attendance.checkInTime,
        checkOutTime: now,
        workPolicy: {
          startTime: workPolicy.startTime,
          endTime: workPolicy.endTime,
          breakMinutes: workPolicy.breakMinutes,
          workDays: workPolicy.workDays,
          lateGraceMinutes: workPolicy.lateGraceMinutes,
          earlyLeaveGraceMinutes: workPolicy.earlyLeaveGraceMinutes,
          nightWorkStartTime: workPolicy.nightWorkStartTime,
          nightWorkEndTime: workPolicy.nightWorkEndTime,
          overtimeThresholdMinutes: workPolicy.overtimeThresholdMinutes,
        },
        isHoliday,
        date: today,
      });

      // check-in 때 LATE였으면 LATE 유지, 아니면 classifier 결과 사용
      const status = attendance.status === 'LATE' ? 'LATE' : result.status;

      updateData = {
        ...updateData,
        status,
        regularMinutes: result.regularMinutes,
        overtimeMinutes: result.overtimeMinutes,
        nightMinutes: result.nightMinutes,
        nightOvertimeMinutes: result.nightOvertimeMinutes,
        holidayMinutes: result.holidayMinutes,
        holidayOvertimeMinutes: result.holidayOvertimeMinutes,
        holidayNightMinutes: result.holidayNightMinutes,
        holidayNightOvertimeMinutes: result.holidayNightOvertimeMinutes,
        lateMinutes: result.lateMinutes,
        earlyLeaveMinutes: result.earlyLeaveMinutes,
        totalMinutes: result.totalMinutes,
        isHoliday,
      };

      // Segment 생성
      if (result.segments.length > 0) {
        await attendanceRepo.replaceSegments(
          auth.companyId,
          attendance.id,
          result.segments,
        );
      }
    } else {
      // Fallback: 단순 시간차 계산
      const totalMinutes = attendance.checkInTime
        ? Math.floor((now.getTime() - attendance.checkInTime.getTime()) / 60000)
        : 0;
      updateData.totalMinutes = totalMinutes;
    }

    const updated = await attendanceRepo.update(auth.companyId, attendance.id, updateData);

    return successResponse(updated);
  } catch {
    return errorResponse('퇴근 처리 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
