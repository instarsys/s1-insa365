import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { confirmAttendanceSchema } from '@/presentation/api/schemas';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(confirmAttendanceSchema, body);
    if (!validation.success) return validation.response;
    const { year, month, userIds } = validation.data;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { userRepo, attendanceRepo, salaryAttendanceRepo } = getContainer();

    const employees = await userRepo.findActiveUsers(auth.companyId, userIds);
    const empIds = employees.map((e) => e.id);

    // Mark attendances as confirmed
    await attendanceRepo.confirmByDateRange(auth.companyId, empIds, startDate, endDate);

    // Create SalaryAttendanceData snapshots
    const now = new Date();
    for (const empId of empIds) {
      const attendances = await attendanceRepo.findMonthly(auth.companyId, empId, year, month);

      const existing = await salaryAttendanceRepo.findByEmployeeAndPeriod(
        auth.companyId, empId, year, month,
      );

      const workDays = attendances.filter((a) => a.checkInTime).length;

      await salaryAttendanceRepo.create({
          companyId: auth.companyId,
          userId: empId,
          year,
          month,
          workDays,
          actualWorkDays: workDays,
          absentDays: attendances.filter((a) => a.status === 'ABSENT').length,
          lateDays: attendances.filter((a) => a.status === 'LATE').length,
          earlyLeaveDays: attendances.filter((a) => a.status === 'EARLY_LEAVE').length,
          leaveDays: attendances.filter((a) => a.status === 'LEAVE').length,
          totalRegularMinutes: attendances.reduce((s, a) => s + a.regularMinutes, 0),
          totalOvertimeMinutes: attendances.reduce((s, a) => s + a.overtimeMinutes, 0),
          totalNightMinutes: attendances.reduce((s, a) => s + a.nightMinutes, 0),
          totalNightOvertimeMinutes: attendances.reduce((s, a) => s + a.nightOvertimeMinutes, 0),
          totalHolidayMinutes: attendances.reduce((s, a) => s + a.holidayMinutes, 0),
          totalHolidayOvertimeMinutes: attendances.reduce((s, a) => s + a.holidayOvertimeMinutes, 0),
          totalHolidayNightMinutes: attendances.reduce((s, a) => s + a.holidayNightMinutes, 0),
          totalHolidayNightOvertimeMinutes: attendances.reduce((s, a) => s + a.holidayNightOvertimeMinutes, 0),
          confirmedAt: now,
          confirmedBy: auth.userId,
          version: (existing?.version ?? 0) + 1,
      });
    }

    await auditLogService.log({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CONFIRM',
      entityType: 'Attendance',
      after: { year, month, confirmedCount: empIds.length } as Record<string, unknown>,
    });

    return successResponse({ confirmedCount: empIds.length });
  } catch {
    return errorResponse('근태 확정 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('MANAGER', handler) as (request: NextRequest) => Promise<NextResponse>;
