import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withPermission } from '@/presentation/middleware/withPermission';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse } from '@/presentation/api/helpers';
import { AttendanceClassifier, isWorkDay } from '@/domain/services/AttendanceClassifier';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { userId, date, checkInTime, checkOutTime, status, note, isHoliday, isConfirmed } = await request.json();

    if (!userId || !date) {
      return errorResponse('직원과 날짜를 지정해주세요.', 400);
    }

    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));

    const { attendanceRepo, employeeRepo, workPolicyRepo, auditLogRepo, leaveRequestRepo } = getContainer();

    const existing = await attendanceRepo.findByDate(auth.companyId, userId, dateObj);

    if (existing?.isConfirmed) {
      return errorResponse('확정된 근태는 수정할 수 없습니다. 근태 확정을 먼저 취소해주세요.', 400);
    }

    // 승인된 휴가 중복 검사
    const approvedLeaves = await leaveRequestRepo.findApprovedByPeriod(auth.companyId, userId, dateObj, dateObj);
    if (approvedLeaves.length > 0) {
      return errorResponse('해당 날짜에 승인된 휴가가 있어 근태를 입력할 수 없습니다. 휴가를 먼저 취소해주세요.', 409);
    }

    // checkIn+checkOut 둘 다 있으면 AttendanceClassifier로 자동 계산
    let minutesData: Record<string, unknown> = {};
    let autoStatus: string | null = null;
    let autoIsHoliday = isHoliday ?? false;
    let classifySegments: Array<{ startTime: Date; endTime: Date; type: string; minutes: number }> = [];

    if (checkInTime && checkOutTime) {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);

      // WorkPolicy 조회
      const user = await employeeRepo.findById(auth.companyId, userId);
      let workPolicy = user?.workPolicyId
        ? await workPolicyRepo.findById(auth.companyId, user.workPolicyId)
        : null;
      if (!workPolicy) {
        workPolicy = await workPolicyRepo.findDefault(auth.companyId);
      }

      if (workPolicy) {
        // isHoliday: 명시적으로 전달된 값 우선, 없으면 workDays 기반 자동 판정
        if (isHoliday === undefined || isHoliday === null) {
          autoIsHoliday = !isWorkDay(dateObj, workPolicy.workDays);
        }

        const result = AttendanceClassifier.classify({
          checkInTime: checkIn,
          checkOutTime: checkOut,
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
          isHoliday: autoIsHoliday,
          date: dateObj,
        });

        minutesData = {
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
        };

        autoStatus = result.status;
        classifySegments = result.segments;
      } else {
        // Fallback: 단순 시간차
        const totalMinutes = Math.floor(
          (checkOut.getTime() - checkIn.getTime()) / 60000,
        );
        minutesData = { totalMinutes };
      }
    }

    // 관리자가 명시적으로 status를 지정하면 그 값 우선 사용
    const finalStatus = status ?? autoStatus ?? 'ON_TIME';

    const data = {
      checkInTime: checkInTime ? new Date(checkInTime) : null,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
      status: finalStatus,
      note: note ?? null,
      isHoliday: autoIsHoliday,
      ...minutesData,
      ...(isConfirmed !== undefined && { isConfirmed }),
    };

    const attendance = existing
      ? await attendanceRepo.update(auth.companyId, existing.id, data)
      : await attendanceRepo.create(auth.companyId, {
          companyId: auth.companyId,
          userId,
          date: dateObj,
          ...data,
        });

    // Segment 생성 (update 시에도)
    if (attendance && classifySegments.length > 0) {
      await attendanceRepo.replaceSegments(
        auth.companyId,
        attendance.id,
        classifySegments,
      );
    }

    await auditLogRepo.create({
      userId: auth.userId,
      companyId: auth.companyId,
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'Attendance',
      entityId: attendance!.id,
      after: { userId, date, ...data } as Record<string, unknown>,
    });

    return createdResponse(attendance);
  } catch (err) {
    console.error('근태 수동 입력 오류:', err);
    return errorResponse(
      err instanceof Error ? err.message : '근태 수동 입력 중 오류가 발생했습니다.',
      500,
    );
  }
}

export const POST = withPermission('ATTENDANCE_MGMT', 'EDIT', handler) as (request: NextRequest) => Promise<NextResponse>;
