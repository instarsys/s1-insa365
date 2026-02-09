import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { userId, date, checkInTime, checkOutTime, status, note, isHoliday, isConfirmed } = await request.json();

    if (!userId || !date) {
      return errorResponse('직원과 날짜를 지정해주세요.', 400);
    }

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const { attendanceRepo } = getContainer();

    const existing = await attendanceRepo.findByDate(auth.companyId, userId, dateObj);

    let totalMinutes = 0;
    if (checkInTime && checkOutTime) {
      totalMinutes = Math.floor(
        (new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 60000,
      );
    }

    const data = {
      checkInTime: checkInTime ? new Date(checkInTime) : null,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
      status: status ?? 'ON_TIME',
      note: note ?? null,
      isHoliday: isHoliday ?? false,
      totalMinutes,
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

    await auditLogService.log({
      userId: auth.userId,
      companyId: auth.companyId,
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'Attendance',
      entityId: attendance!.id,
      after: { userId, date, ...data } as Record<string, unknown>,
    });

    return createdResponse(attendance);
  } catch {
    return errorResponse('근태 수동 입력 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('MANAGER', handler) as (request: NextRequest) => Promise<NextResponse>;
