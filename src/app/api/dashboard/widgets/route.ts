import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Employee count
  const totalEmployees = await prisma.user.count({
    where: { companyId: auth.companyId, deletedAt: null, employeeStatus: 'ACTIVE' },
  });

  // Today's attendance breakdown
  const attendanceRecords = await prisma.attendance.findMany({
    where: { companyId: auth.companyId, date: today, deletedAt: null },
    select: { status: true },
  });

  const present = attendanceRecords.filter((a) => a.status === 'ON_TIME' || a.status === 'LATE').length;
  const absent = attendanceRecords.filter((a) => a.status === 'ABSENT').length;
  const late = attendanceRecords.filter((a) => a.status === 'LATE').length;
  const leave = attendanceRecords.filter((a) => a.status === 'LEAVE' || a.status === 'HALF_DAY').length;

  // This month payroll
  const payrollCalcs = await prisma.salaryCalculation.findMany({
    where: { companyId: auth.companyId, year: currentYear, month: currentMonth, deletedAt: null },
    select: { totalPay: true },
  });

  const monthlyPayroll = payrollCalcs.reduce((s, c) => s + Number(c.totalPay), 0);

  // 52-hour overtime warnings (past 7 days, > 48h = 2880 min)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);

  const overtimeGroups = await prisma.attendance.groupBy({
    by: ['userId'],
    where: {
      companyId: auth.companyId,
      date: { gte: weekStart, lte: today },
      deletedAt: null,
    },
    _sum: { totalMinutes: true },
    having: { totalMinutes: { _sum: { gt: 2880 } } },
  });

  const overtimeWarnings = overtimeGroups.length;

  // Pending leaves
  const pendingLeaves = await prisma.leaveRequest.count({
    where: { companyId: auth.companyId, status: 'PENDING', deletedAt: null },
  });

  return successResponse({
    totalEmployees,
    monthlyPayroll,
    todayAttendance: {
      present,
      absent,
      late,
      leave,
      total: totalEmployees,
    },
    overtimeWarnings,
    pendingLeaves,
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
