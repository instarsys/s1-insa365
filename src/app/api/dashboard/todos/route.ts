import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todos = [];

  // 1. Pending leave requests (for managers)
  if (auth.role !== 'EMPLOYEE') {
    const pendingLeaves = await prisma.leaveRequest.count({
      where: { companyId: auth.companyId, status: 'PENDING', deletedAt: null },
    });
    if (pendingLeaves > 0) {
      todos.push({
        id: 'leave-approval',
        type: 'LEAVE_APPROVAL',
        title: '휴가 승인 대기',
        description: `${pendingLeaves}건의 휴가 신청이 승인을 기다리고 있습니다.`,
        count: pendingLeaves,
        link: '/admin/attendance/leave',
        priority: 'HIGH',
      });
    }
  }

  // 2. Unconfirmed attendance
  if (auth.role !== 'EMPLOYEE') {
    const unconfirmedCount = await prisma.attendance.count({
      where: {
        companyId: auth.companyId,
        date: { gte: new Date(currentYear, currentMonth - 1, 1), lt: today },
        isConfirmed: false,
        deletedAt: null,
      },
    });
    if (unconfirmedCount > 0) {
      todos.push({
        id: 'attendance-confirm',
        type: 'ATTENDANCE_CONFIRM',
        title: '근태 확정 필요',
        description: `${unconfirmedCount}건의 미확정 근태 기록이 있습니다.`,
        count: unconfirmedCount,
        link: '/admin/attendance/monthly',
        priority: 'MEDIUM',
      });
    }
  }

  // 3. Draft payroll
  if (auth.role === 'COMPANY_ADMIN' || auth.role === 'SYSTEM_ADMIN') {
    const draftPayroll = await prisma.salaryCalculation.count({
      where: {
        companyId: auth.companyId,
        year: currentYear,
        month: currentMonth,
        status: 'DRAFT',
        deletedAt: null,
      },
    });
    if (draftPayroll > 0) {
      todos.push({
        id: 'payroll-confirm',
        type: 'PAYROLL_CONFIRM',
        title: '급여 확정 필요',
        description: `${currentMonth}월 급여가 임시 상태입니다. 확인 후 확정해주세요.`,
        count: draftPayroll,
        link: '/admin/payroll',
        priority: 'HIGH',
      });
    }
  }

  // 4. 52-hour violations
  if (auth.role !== 'EMPLOYEE') {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const overtimeEmployees = await prisma.attendance.groupBy({
      by: ['userId'],
      where: {
        companyId: auth.companyId,
        date: { gte: weekStart, lte: today },
        deletedAt: null,
      },
      _sum: { totalMinutes: true },
      having: { totalMinutes: { _sum: { gt: 2880 } } }, // 48h warning threshold
    });

    if (overtimeEmployees.length > 0) {
      todos.push({
        id: 'overtime-warning',
        type: 'OVERTIME_WARNING',
        title: '52시간 주의',
        description: `${overtimeEmployees.length}명이 주 48시간을 초과했습니다.`,
        count: overtimeEmployees.length,
        link: '/admin/attendance/52hour',
        priority: 'URGENT',
      });
    }
  }

  // 5. Unread notifications (for employees)
  const unreadCount = await prisma.notification.count({
    where: { userId: auth.userId, isRead: false },
  });
  if (unreadCount > 0) {
    todos.push({
      id: 'unread-notifications',
      type: 'NOTIFICATIONS',
      title: '읽지 않은 알림',
      description: `${unreadCount}개의 읽지 않은 알림이 있습니다.`,
      count: unreadCount,
      link: auth.role === 'EMPLOYEE' ? '/e/home' : '/admin/dashboard',
      priority: 'LOW',
    });
  }

  return successResponse({ items: todos });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
