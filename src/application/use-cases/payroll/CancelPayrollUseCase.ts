import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { IPayrollMonthlyRepository } from '../../ports/IPayrollMonthlyRepository';
import type { IAuditLogRepository } from '../../ports/IAuditLogRepository';
import { ValidationError } from '@domain/errors';

export class CancelPayrollUseCase {
  constructor(
    private salaryCalcRepo: ISalaryCalculationRepository,
    private payrollMonthlyRepo: IPayrollMonthlyRepository,
    private auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(
    companyId: string,
    year: number,
    month: number,
    cancelledBy: string,
    payrollGroupId?: string,
    force = false,
  ): Promise<{ cancelledCount: number }> {
    const allCalculations = await this.salaryCalcRepo.findByPeriod(companyId, year, month);
    const calculations = payrollGroupId
      ? allCalculations.filter((c) => c.payrollGroupId === payrollGroupId)
      : allCalculations;

    const hasPaid = calculations.some((c) => c.status === 'PAID');
    if (hasPaid) {
      throw new ValidationError('지급 완료된 급여는 취소할 수 없습니다.');
    }

    const confirmed = calculations.filter((c) => c.status === 'CONFIRMED');
    if (confirmed.length === 0) {
      throw new ValidationError('취소할 확정 급여가 없습니다.');
    }

    // 확정된 급여는 취소 불가 (force=true: SYSTEM_ADMIN 이력 삭제 전용)
    if (!force) {
      throw new ValidationError('확정된 급여는 취소할 수 없습니다.');
    }

    // CONFIRMED → DRAFT 전환 (그룹별로 해당 직원만)
    const confirmedUserIds = confirmed.map((c) => c.userId ?? c.employeeId);
    await this.salaryCalcRepo.revertConfirmedToDraft(companyId, year, month, confirmedUserIds);

    // PayrollMonthly 삭제 (해당 직원만)
    await this.payrollMonthlyRepo.deleteByPeriodAndUserIds(companyId, year, month, confirmedUserIds);

    // 감사 로그
    await this.auditLogRepo.create({
      userId: cancelledBy,
      companyId,
      action: 'CANCEL',
      entityType: 'SalaryCalculation',
      after: { year, month, cancelledCount: confirmed.length } as Record<string, unknown>,
    });

    return { cancelledCount: confirmed.length };
  }
}
