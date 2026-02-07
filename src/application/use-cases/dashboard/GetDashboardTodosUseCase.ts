import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { ILeaveRequestRepository } from '../../ports/ILeaveRequestRepository';
import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';

export interface TodoItem {
  id: string;
  type: 'ATTENDANCE_CONFIRM' | 'LEAVE_PENDING' | 'PAYROLL_DRAFT' | 'OVERTIME_WARNING';
  title: string;
  description: string;
  link: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  count?: number;
}

export class GetDashboardTodosUseCase {
  constructor(
    private attendanceRepo: IAttendanceRepository,
    private leaveRequestRepo: ILeaveRequestRepository,
    private salaryCalcRepo: ISalaryCalculationRepository,
  ) {}

  async execute(companyId: string): Promise<TodoItem[]> {
    const todos: TodoItem[] = [];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Check for unconfirmed attendance
    const isConfirmed = await this.attendanceRepo.isMonthConfirmed(companyId, year, month);
    if (!isConfirmed) {
      todos.push({
        id: `att-confirm-${year}-${month}`,
        type: 'ATTENDANCE_CONFIRM',
        title: `${month}월 근태 확정`,
        description: '이번 달 근태를 확정해주세요.',
        link: `/attendance/monthly`,
        priority: 'HIGH',
      });
    }

    // Check for pending leave requests
    const pendingCount = await this.leaveRequestRepo.countPending(companyId);
    if (pendingCount > 0) {
      todos.push({
        id: `leave-pending`,
        type: 'LEAVE_PENDING',
        title: '대기 중인 휴가 신청',
        description: `${pendingCount}건의 휴가 신청이 대기 중입니다.`,
        link: `/leave`,
        priority: 'MEDIUM',
        count: pendingCount,
      });
    }

    // Check for draft payroll
    const summary = await this.salaryCalcRepo.getSummary(companyId, year, month);
    if (summary && summary.status === 'DRAFT') {
      todos.push({
        id: `payroll-draft-${year}-${month}`,
        type: 'PAYROLL_DRAFT',
        title: `${month}월 급여 확정`,
        description: '계산된 급여를 확인하고 확정해주세요.',
        link: `/payroll`,
        priority: 'HIGH',
      });
    }

    return todos;
  }
}
