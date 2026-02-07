import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

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
}
