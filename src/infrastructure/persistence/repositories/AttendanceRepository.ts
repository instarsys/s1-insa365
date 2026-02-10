import { prisma } from '../prisma/client';
import type { Prisma, AttendanceStatus } from '@/generated/prisma/client';

export interface AttendanceFilters {
  userId?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class AttendanceRepository {
  async findByDate(companyId: string, userId: string, date: Date) {
    return prisma.attendance.findFirst({
      where: { companyId, userId, date, deletedAt: null },
      include: { segments: true },
    });
  }

  async findDailyAll(companyId: string, date: Date, filters: AttendanceFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const where: Prisma.AttendanceWhereInput = { companyId, date, deletedAt: null };

    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status as Prisma.EnumAttendanceStatusFilter['equals'];
    if (filters.departmentId) {
      where.user = { departmentId: filters.departmentId, deletedAt: null };
    }

    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: { include: { department: true, position: true } },
          segments: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.attendance.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findMonthly(companyId: string, userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return prisma.attendance.findMany({
      where: {
        companyId,
        userId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: { segments: true },
      orderBy: { date: 'asc' },
    });
  }

  async create(companyId: string, data: Prisma.AttendanceUncheckedCreateInput) {
    return prisma.attendance.create({
      data: { ...data, companyId },
      include: { segments: true },
    });
  }

  async update(companyId: string, id: string, data: Prisma.AttendanceUpdateInput) {
    const existing = await prisma.attendance.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.attendance.update({
      where: { id },
      data,
      include: { segments: true },
    });
  }

  async confirmMonth(
    companyId: string,
    year: number,
    month: number,
    confirmedBy: string,
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Mark all attendance as confirmed
    await prisma.attendance.updateMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        isConfirmed: false,
      },
      data: { isConfirmed: true },
    });

    // Get all users with attendance this month to create snapshots
    const attendanceByUser = await prisma.attendance.groupBy({
      by: ['userId'],
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: {
        regularMinutes: true,
        overtimeMinutes: true,
        nightMinutes: true,
        nightOvertimeMinutes: true,
        holidayMinutes: true,
        holidayOvertimeMinutes: true,
        holidayNightMinutes: true,
        holidayNightOvertimeMinutes: true,
      },
      _count: { id: true },
    });

    // Create SalaryAttendanceData snapshots
    const snapshots = [];
    for (const agg of attendanceByUser) {
      // Count specific day types
      const absentCount = await prisma.attendance.count({
        where: { companyId, userId: agg.userId, date: { gte: startDate, lte: endDate }, status: 'ABSENT', deletedAt: null },
      });
      const lateCount = await prisma.attendance.count({
        where: { companyId, userId: agg.userId, date: { gte: startDate, lte: endDate }, status: 'LATE', deletedAt: null },
      });
      const earlyLeaveCount = await prisma.attendance.count({
        where: { companyId, userId: agg.userId, date: { gte: startDate, lte: endDate }, status: 'EARLY_LEAVE', deletedAt: null },
      });
      const leaveCount = await prisma.attendance.count({
        where: { companyId, userId: agg.userId, date: { gte: startDate, lte: endDate }, status: 'LEAVE', deletedAt: null },
      });

      // Check for existing version
      const existing = await prisma.salaryAttendanceData.findFirst({
        where: { companyId, userId: agg.userId, year, month },
        orderBy: { version: 'desc' },
      });
      const nextVersion = existing ? existing.version + 1 : 1;

      const snapshot = await prisma.salaryAttendanceData.create({
        data: {
          companyId,
          userId: agg.userId,
          year,
          month,
          workDays: agg._count.id,
          actualWorkDays: agg._count.id - absentCount,
          absentDays: absentCount,
          lateDays: lateCount,
          earlyLeaveDays: earlyLeaveCount,
          leaveDays: leaveCount,
          totalRegularMinutes: agg._sum.regularMinutes ?? 0,
          totalOvertimeMinutes: agg._sum.overtimeMinutes ?? 0,
          totalNightMinutes: agg._sum.nightMinutes ?? 0,
          totalNightOvertimeMinutes: agg._sum.nightOvertimeMinutes ?? 0,
          totalHolidayMinutes: agg._sum.holidayMinutes ?? 0,
          totalHolidayOvertimeMinutes: agg._sum.holidayOvertimeMinutes ?? 0,
          totalHolidayNightMinutes: agg._sum.holidayNightMinutes ?? 0,
          totalHolidayNightOvertimeMinutes: agg._sum.holidayNightOvertimeMinutes ?? 0,
          confirmedAt: new Date(),
          confirmedBy,
          version: nextVersion,
        },
      });
      snapshots.push(snapshot);
    }

    return snapshots;
  }

  async findByIdAndCompany(companyId: string, id: string) {
    return prisma.attendance.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { user: true, segments: true },
    });
  }

  async confirmByDateRange(companyId: string, userIds: string[], startDate: Date, endDate: Date) {
    const result = await prisma.attendance.updateMany({
      where: {
        companyId,
        userId: { in: userIds },
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        isConfirmed: false,
      },
      data: { isConfirmed: true },
    });
    return result.count;
  }

  async countUnconfirmedByPeriod(companyId: string, startDate: Date, endDate: Date) {
    return prisma.attendance.count({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        isConfirmed: false,
        deletedAt: null,
      },
    });
  }

  async getTodayBreakdown(companyId: string, date: Date) {
    const where = { companyId, date, deletedAt: null };
    const [present, late, leave] = await Promise.all([
      prisma.attendance.count({ where: { ...where, status: 'ON_TIME' as AttendanceStatus } }),
      prisma.attendance.count({ where: { ...where, status: 'LATE' as AttendanceStatus } }),
      prisma.attendance.count({ where: { ...where, status: 'LEAVE' as AttendanceStatus } }),
    ]);
    return { present, late, leave };
  }

  async getOvertimeWarnings(companyId: string, days: number, minuteThreshold: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const result = await prisma.attendance.groupBy({
      by: ['userId'],
      where: {
        companyId,
        date: { gte: since },
        deletedAt: null,
      },
      _sum: { totalMinutes: true },
      having: { totalMinutes: { _sum: { gte: minuteThreshold } } },
    });
    return result.map((r) => ({ userId: r.userId, totalMinutes: r._sum.totalMinutes ?? 0 }));
  }

  async getWeeklyHours(companyId: string, userId: string, weekStartDate: Date, weekEndDate: Date) {
    const result = await prisma.attendance.aggregate({
      where: {
        companyId,
        userId,
        date: { gte: weekStartDate, lte: weekEndDate },
        deletedAt: null,
      },
      _sum: { totalMinutes: true },
    });

    return (result._sum.totalMinutes ?? 0) / 60;
  }

  /** 전체 근태 조회 (날짜 범위, 리포트용 — user.departmentId 포함) */
  async findAllByDateRange(companyId: string, startDate: Date, endDate: Date) {
    return prisma.attendance.findMany({
      where: {
        companyId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        status: true,
        regularMinutes: true,
        overtimeMinutes: true,
        totalMinutes: true,
        user: { select: { departmentId: true } },
      },
    });
  }

  /** 전체 월별 근태 조회 (리포트 요약용) */
  async findAllByMonth(companyId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return prisma.attendance.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
    });
  }

  /** 달력형: 여러 사용자의 기간별 근태 조회 */
  async findByUserIdsAndDateRange(
    companyId: string,
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ) {
    if (userIds.length === 0) return [];
    return prisma.attendance.findMany({
      where: {
        companyId,
        userId: { in: userIds },
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        date: true,
        checkInTime: true,
        checkOutTime: true,
        status: true,
        isConfirmed: true,
        totalMinutes: true,
        note: true,
      },
    });
  }

  /** 목록형: 기간별 근태 조회 (include user, pagination, sort) */
  async findDailyRange(
    companyId: string,
    options: {
      startDate: Date;
      endDate: Date;
      departmentId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortKey?: string;
      sortDir?: 'asc' | 'desc';
    },
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {
      companyId,
      date: { gte: options.startDate, lte: options.endDate },
      deletedAt: null,
    };
    if (options.departmentId) {
      where.user = { departmentId: options.departmentId };
    }
    if (options.status) {
      where.status = options.status as Prisma.EnumAttendanceStatusFilter['equals'];
    }
    if (options.search) {
      where.user = {
        ...(where.user as Record<string, unknown> || {}),
        name: { contains: options.search },
      };
    }

    const orderBy: Record<string, unknown> = {};
    const sortKey = options.sortKey || 'date';
    const sortDir = options.sortDir || 'desc';
    if (sortKey === 'userName') {
      orderBy.user = { name: sortDir };
    } else if (sortKey === 'departmentName') {
      orderBy.user = { department: { name: sortDir } };
    } else if (sortKey === 'checkInTime') {
      orderBy.checkInTime = sortDir;
    } else if (sortKey === 'checkOutTime') {
      orderBy.checkOutTime = sortDir;
    } else if (sortKey === 'totalMinutes') {
      orderBy.totalMinutes = sortDir;
    } else {
      orderBy.date = sortDir;
    }

    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeNumber: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: [orderBy],
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    return { items, total, page };
  }

  /** 목록형: 기간별 근태 시간 합계 (aggregate) */
  async aggregateMinutesByDateRange(
    companyId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ) {
    const result = await prisma.attendance.aggregate({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        ...(departmentId && { user: { departmentId } }),
      },
      _sum: {
        regularMinutes: true,
        overtimeMinutes: true,
        nightMinutes: true,
        totalMinutes: true,
      },
    });
    return {
      totalRegularMinutes: result._sum.regularMinutes ?? 0,
      totalOvertimeMinutes: result._sum.overtimeMinutes ?? 0,
      totalNightMinutes: result._sum.nightMinutes ?? 0,
      totalMinutes: result._sum.totalMinutes ?? 0,
    };
  }

  /** 단일날짜: 근태 조회 + 직원 수 (하위호환) */
  async findDailySingle(
    companyId: string,
    date: Date,
    options: { departmentId?: string } = {},
  ) {
    const [attendances, totalEmployees] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          companyId,
          date,
          deletedAt: null,
          ...(options.departmentId && { user: { departmentId: options.departmentId } }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeNumber: true,
              department: { select: { name: true } },
              position: { select: { name: true } },
            },
          },
        },
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.user.count({
        where: {
          companyId,
          deletedAt: null,
          employeeStatus: 'ACTIVE',
          ...(options.departmentId && { departmentId: options.departmentId }),
        },
      }),
    ]);
    return { attendances, totalEmployees };
  }

  /** 월별 근태: 직원별 월간 근태 (attendance/monthly) */
  async findEmployeesWithMonthlyAttendances(
    companyId: string,
    year: number,
    month: number,
    options: { departmentId?: string } = {},
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        employeeStatus: 'ACTIVE',
        ...(options.departmentId && { departmentId: options.departmentId }),
      },
      select: {
        id: true,
        name: true,
        employeeNumber: true,
        department: { select: { name: true } },
        position: { select: { name: true } },
        attendances: {
          where: {
            date: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          select: {
            date: true,
            status: true,
            checkInTime: true,
            checkOutTime: true,
            regularMinutes: true,
            overtimeMinutes: true,
            nightMinutes: true,
            totalMinutes: true,
            isConfirmed: true,
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** 52시간: 직원별 주간 근태 집계 (attendance/52hour) */
  async findEmployeesWithWeeklyAttendances(
    companyId: string,
    year: number,
    month: number,
    options: { departmentId?: string } = {},
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        employeeStatus: 'ACTIVE',
        ...(options.departmentId && { departmentId: options.departmentId }),
      },
      select: {
        id: true,
        name: true,
        employeeNumber: true,
        department: { select: { name: true } },
        attendances: {
          where: {
            date: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          select: {
            date: true,
            regularMinutes: true,
            overtimeMinutes: true,
            nightMinutes: true,
            nightOvertimeMinutes: true,
            totalMinutes: true,
          },
        },
      },
    });
  }

  /** 출퇴근 누락 조회: checkIn 있지만 checkOut 없는 기록 */
  async findMissingCheckouts(companyId: string, startDate: Date, endDate: Date) {
    return prisma.attendance.findMany({
      where: {
        companyId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        checkInTime: { not: null },
        checkOutTime: null,
      },
      include: {
        user: {
          select: { id: true, name: true, employeeNumber: true, department: { select: { name: true } } },
        },
      },
      orderBy: { date: 'desc' },
      take: 20,
    });
  }
}
