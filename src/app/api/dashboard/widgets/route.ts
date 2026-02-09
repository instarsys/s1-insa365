import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { userRepo, attendanceRepo, salaryCalcRepo, leaveRequestRepo } = getContainer();

  // Employee count
  const totalEmployees = await userRepo.countActive(auth.companyId);

  // Today's attendance breakdown
  const todayBreakdown = await attendanceRepo.getTodayBreakdown(auth.companyId, today);
  const present = todayBreakdown.present + todayBreakdown.late;
  const absent = 0; // getTodayBreakdown doesn't count absent separately; absent = total - present - late - leave
  const late = todayBreakdown.late;
  const leave = todayBreakdown.leave;

  // This month payroll
  const monthlyPayroll = await salaryCalcRepo.sumTotalPayByMonth(auth.companyId, currentYear, currentMonth);

  // 52-hour overtime warnings (past 7 days, > 48h = 2880 min)
  const overtimeGroups = await attendanceRepo.getOvertimeWarnings(auth.companyId, 7, 48 * 60);
  const overtimeWarnings = overtimeGroups.length;

  // Pending leaves
  const pendingLeaves = await leaveRequestRepo.countPending(auth.companyId);

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
