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
  ): Promise<{ cancelledCount: number }> {
    const calculations = await this.salaryCalcRepo.findByPeriod(companyId, year, month);

    const confirmed = calculations.filter((c) => c.status === 'CONFIRMED');
    if (confirmed.length === 0) {
      throw new ValidationError('취소할 확정 급여가 없습니다.');
    }

    const hasPaid = calculations.some((c) => c.status === 'PAID');
    if (hasPaid) {
      throw new ValidationError('지급 완료된 급여는 취소할 수 없습니다.');
    }

    // 24시간 취소 제한
    const firstConfirmed = confirmed[0];
    if (firstConfirmed.confirmedAt) {
      const confirmedTime = typeof firstConfirmed.confirmedAt === 'string'
        ? new Date(firstConfirmed.confirmedAt).getTime()
        : new Date(firstConfirmed.confirmedAt).getTime();
      const hoursSinceConfirm = (Date.now() - confirmedTime) / (1000 * 60 * 60);
      if (hoursSinceConfirm > 24) {
        throw new ValidationError('확정 후 24시간이 지나 취소할 수 없습니다.');
      }
    }

    // CONFIRMED → DRAFT 전환
    await this.salaryCalcRepo.revertConfirmedToDraft(companyId, year, month);

    // PayrollMonthly 삭제
    await this.payrollMonthlyRepo.deleteByPeriod(companyId, year, month);

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
