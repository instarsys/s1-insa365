import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { year, month, userIds } = await request.json();

    if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const targetUserIds = userIds as string[] | undefined;

    const userWhere = {
      companyId: auth.companyId,
      deletedAt: null,
      employeeStatus: 'ACTIVE' as const,
      ...(targetUserIds && { id: { in: targetUserIds } }),
    };

    const employees = await prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    const empIds = employees.map((e) => e.id);

    // Mark attendances as confirmed
    await prisma.attendance.updateMany({
      where: {
        companyId: auth.companyId,
        userId: { in: empIds },
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        isConfirmed: false,
      },
      data: { isConfirmed: true },
    });

    // Create SalaryAttendanceData snapshots
    const now = new Date();
    for (const empId of empIds) {
      const attendances = await prisma.attendance.findMany({
        where: {
          companyId: auth.companyId,
          userId: empId,
          date: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
      });

      const existing = await prisma.salaryAttendanceData.findFirst({
        where: { companyId: auth.companyId, userId: empId, year, month },
        orderBy: { version: 'desc' },
      });

      const workDays = attendances.filter((a) => a.checkInTime).length;

      await prisma.salaryAttendanceData.create({
        data: {
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
        },
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
