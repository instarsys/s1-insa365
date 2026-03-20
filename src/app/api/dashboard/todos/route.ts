import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { leaveRequestRepo, attendanceRepo, salaryCalcRepo, notificationRepo } = getContainer();

  const todos = [];

  // 1. Pending leave requests (for managers)
  if (auth.role !== 'EMPLOYEE') {
    const pendingLeaves = await leaveRequestRepo.countPending(auth.companyId);
    if (pendingLeaves > 0) {
      todos.push({
        id: 'leave-approval',
        type: 'LEAVE_APPROVAL',
        title: '휴가 승인 대기',
        description: `${pendingLeaves}건의 휴가 신청이 승인을 기다리고 있습니다.`,
        count: pendingLeaves,
        link: '/attendance/leave',
        priority: 'HIGH',
      });
    }
  }

  // 2. Unconfirmed attendance
  if (auth.role !== 'EMPLOYEE') {
    const unconfirmedCount = await attendanceRepo.countUnconfirmedByPeriod(
      auth.companyId,
      new Date(currentYear, currentMonth - 1, 1),
      today,
    );
    if (unconfirmedCount > 0) {
      todos.push({
        id: 'attendance-confirm',
        type: 'ATTENDANCE_CONFIRM',
        title: '근태 확정 필요',
        description: `${unconfirmedCount}건의 미확정 근태 기록이 있습니다.`,
        count: unconfirmedCount,
        link: '/attendance/monthly',
        priority: 'MEDIUM',
      });
    }
  }

  // 3. Draft payroll
  if (auth.role === 'COMPANY_ADMIN' || auth.role === 'SYSTEM_ADMIN') {
    const draftPayroll = await salaryCalcRepo.countDraftByMonth(auth.companyId, currentYear, currentMonth);
    if (draftPayroll > 0) {
      todos.push({
        id: 'payroll-confirm',
        type: 'PAYROLL_CONFIRM',
        title: '급여 확정 필요',
        description: `${currentMonth}월 급여가 임시 상태입니다. 확인 후 확정해주세요.`,
        count: draftPayroll,
        link: '/payroll',
        priority: 'HIGH',
      });
    }
  }

  // 4. 52-hour violations
  if (auth.role !== 'EMPLOYEE') {
    const overtimeEmployees = await attendanceRepo.getOvertimeWarnings(auth.companyId, 7, 48 * 60);

    if (overtimeEmployees.length > 0) {
      todos.push({
        id: 'overtime-warning',
        type: 'OVERTIME_WARNING',
        title: '52시간 주의',
        description: `${overtimeEmployees.length}명이 주 48시간을 초과했습니다.`,
        count: overtimeEmployees.length,
        link: '/attendance/52hour',
        priority: 'URGENT',
      });
    }
  }

  // 5. Unread notifications (for employees)
  const unreadCount = await notificationRepo.getUnreadCount(auth.companyId, auth.userId);
  if (unreadCount > 0) {
    todos.push({
      id: 'unread-notifications',
      type: 'NOTIFICATIONS',
      title: '읽지 않은 알림',
      description: `${unreadCount}개의 읽지 않은 알림이 있습니다.`,
      count: unreadCount,
      link: auth.role === 'EMPLOYEE' ? '/e/home' : '/dashboard',
      priority: 'LOW',
    });
  }

  return successResponse({ items: todos });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
