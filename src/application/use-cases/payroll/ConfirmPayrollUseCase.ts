import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { ISalaryAttendanceDataRepository } from '../../ports/ISalaryAttendanceDataRepository';
import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { ILeaveRequestRepository } from '../../ports/ILeaveRequestRepository';
import type { IPayrollMonthlyRepository } from '../../ports/IPayrollMonthlyRepository';
import type { INotificationRepository } from '../../ports/INotificationRepository';
import type { IAuditLogRepository } from '../../ports/IAuditLogRepository';
import { ValidationError } from '@domain/errors';

export class ConfirmPayrollUseCase {
  constructor(
    private salaryCalcRepo: ISalaryCalculationRepository,
    private salaryAttendanceRepo: ISalaryAttendanceDataRepository,
    private employeeRepo: IEmployeeRepository,
    private leaveRequestRepo: ILeaveRequestRepository,
    private payrollMonthlyRepo: IPayrollMonthlyRepository,
    private notificationRepo: INotificationRepository,
    private auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(
    companyId: string,
    year: number,
    month: number,
    confirmedBy: string,
    payrollGroupId?: string,
  ): Promise<{ confirmedCount: number }> {
    // 활성 직원 조회 (payrollGroupId 필터)
    const activeEmployees = await this.employeeRepo.findAll(companyId, {
      status: 'ACTIVE',
      page: 1,
      limit: 10000,
      ...(payrollGroupId && { payrollGroupId }),
    });
    const targetUserIds = activeEmployees.items.map((e) => e.id);

    // 근태 확정 여부 확인
    const attendanceData = await this.salaryAttendanceRepo.findByPeriod(companyId, year, month);
    const confirmedUserIds = new Set(attendanceData.map((a) => a.userId));
    const unconfirmedEmployees = activeEmployees.items.filter((e) => !confirmedUserIds.has(e.id));

    if (unconfirmedEmployees.length > 0) {
      throw new ValidationError(
        `근태 미확정 직원 ${unconfirmedEmployees.length}명이 있습니다. 근태를 먼저 확정해주세요.`,
      );
    }

    // 미처리 휴가 확인
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));
    const pendingLeaves = await this.leaveRequestRepo.findPendingByPeriod(companyId, startDate, endDate);
    if (pendingLeaves.length > 0) {
      throw new ValidationError(
        `미처리 휴가 ${pendingLeaves.length}건이 있습니다. 휴가 관리에서 먼저 승인/거절해주세요.`,
      );
    }

    // DRAFT 급여 조회
    const drafts = await this.salaryCalcRepo.findByPeriod(companyId, year, month);
    const draftItems = payrollGroupId
      ? drafts.filter((d) => d.status === 'DRAFT' && targetUserIds.includes(d.userId))
      : drafts.filter((d) => d.status === 'DRAFT');

    if (draftItems.length === 0) {
      throw new ValidationError('확정할 급여 계산이 없습니다.');
    }

    // DRAFT → CONFIRMED 상태 변경
    if (payrollGroupId && targetUserIds.length > 0) {
      await this.salaryCalcRepo.updateStatusByUserIds(companyId, year, month, targetUserIds, 'CONFIRMED', confirmedBy);
    } else {
      await this.salaryCalcRepo.updateStatus(companyId, year, month, 'CONFIRMED', confirmedBy);
    }

    // PayrollMonthly 레코드 생성
    for (const calc of draftItems) {
      await this.payrollMonthlyRepo.upsert(companyId, calc.userId, year, month, {
        companyId,
        userId: calc.userId,
        year,
        month,
        totalPay: calc.totalPay,
        taxableIncome: calc.taxableIncome,
        totalNonTaxable: calc.totalNonTaxable,
        nationalPension: calc.nationalPension,
        healthInsurance: calc.healthInsurance,
        longTermCare: calc.longTermCare,
        employmentInsurance: calc.employmentInsurance,
        incomeTax: calc.incomeTax,
        localIncomeTax: calc.localIncomeTax,
        netPay: calc.netPay,
      });

      // 직원 알림
      await this.notificationRepo.create({
        companyId,
        userId: calc.userId,
        type: 'PAYROLL_CONFIRMED',
        priority: 'HIGH',
        title: `${year}년 ${month}월 급여 확정`,
        message: '급여가 확정되었습니다. 급여명세서를 확인해주세요.',
        link: '/e/payroll',
      });
    }

    // 감사 로그
    await this.auditLogRepo.create({
      userId: confirmedBy,
      companyId,
      action: 'CONFIRM',
      entityType: 'SalaryCalculation',
      after: { year, month, confirmedCount: draftItems.length } as Record<string, unknown>,
    });

    return { confirmedCount: draftItems.length };
  }
}
