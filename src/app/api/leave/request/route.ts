import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveRequestSchema } from '@/presentation/api/schemas';
import { countWorkDaysInRange } from '@/domain/services/WorkDayCalculator';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(createLeaveRequestSchema, body);
    if (!validation.success) return validation.response;
    const { type, leaveTypeConfigId, startDate, endDate, days, reason } = validation.data;

    const { leaveRequestRepo, attendanceRepo, employeeRepo, workPolicyRepo, companyHolidayRepo } = getContainer();

    // 근태 중복 검사
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const existingAttendances = await attendanceRepo.findExistingByDateRange(auth.companyId, auth.userId, startDateObj, endDateObj);
    if (existingAttendances.length > 0) {
      const dates = existingAttendances.map((a: { date: Date }) => a.date.toISOString().slice(0, 10)).join(', ');
      return errorResponse(`해당 기간에 근태 기록이 존재하여 휴가를 신청할 수 없습니다. (근태 기록일: ${dates})`, 409);
    }

    // days 자동 계산: 반차는 0.5 고정, 그 외는 근무일 기반 계산
    let finalDays = days;
    if (finalDays === undefined || finalDays === null) {
      if (type === 'HALF_DAY_AM' || type === 'HALF_DAY_PM') {
        finalDays = 0.5;
      } else {
        // 직원의 WorkPolicy + 회사 휴일 기반 근무일 계산
        const employee = await employeeRepo.findById(auth.companyId, auth.userId);
        let workDays = '1,2,3,4,5';
        if (employee?.workPolicyId) {
          const policy = await workPolicyRepo.findById(auth.companyId, employee.workPolicyId);
          if (policy) workDays = policy.workDays;
        } else {
          const defaultPolicy = await workPolicyRepo.findDefault(auth.companyId);
          if (defaultPolicy) workDays = defaultPolicy.workDays;
        }

        const holidays = await companyHolidayRepo.findByPeriod(auth.companyId, startDateObj, endDateObj);
        const holidayDates = new Set(
          holidays.map((h: { date: Date | string }) => {
            const d = new Date(h.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }),
        );

        finalDays = countWorkDaysInRange(startDateObj, endDateObj, workDays, holidayDates);
      }
    }

    if (finalDays <= 0) {
      return errorResponse('해당 기간에 근무일이 없습니다.', 400);
    }

    const leaveRequest = await leaveRequestRepo.create(auth.companyId, {
      companyId: auth.companyId,
      userId: auth.userId,
      type,
      leaveTypeConfigId: leaveTypeConfigId ?? null,
      startDate: startDateObj,
      endDate: endDateObj,
      days: finalDays,
      reason: reason ?? null,
      status: 'PENDING',
    });

    return createdResponse(leaveRequest);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '휴가 신청 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
