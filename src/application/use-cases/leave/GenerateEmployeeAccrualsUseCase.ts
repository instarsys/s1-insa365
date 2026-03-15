import {
  calculateServiceMonths,
  findMatchingTier,
  calculateProRata,
  type AccrualTier,
} from '@domain/services/LeaveAccrualCalculator';

interface LeaveAccrualRuleRepo {
  findActiveWithLeaveTypes(companyId: string): Promise<Array<{
    id: string;
    accrualBasis: string;
    proRataFirstYear: boolean;
    leaveGroup: {
      leaveTypeConfigs: Array<{ id: string }>;
    };
    tiers: Array<{
      serviceMonthFrom: number;
      serviceMonthTo: number;
      accrualDays: number | { toString(): string };
      validMonths: number | null;
      sortOrder: number;
    }>;
  }>>;
}

interface LeaveAccrualRecordRepo {
  findByUserAndRuleAndYear(companyId: string, userId: string, accrualRuleId: string, year: number): Promise<unknown | null>;
  createWithBalanceUpdate(
    data: {
      companyId: string;
      userId: string;
      leaveTypeConfigId: string;
      accrualRuleId: string;
      year: number;
      accrualDays: number;
      periodStart: Date;
      periodEnd: Date;
      expiresAt: Date | null;
      source: string;
      description?: string | null;
    },
    balanceData: { companyId: string; userId: string; year: number; accrualDays: number },
  ): Promise<void>;
}

interface GenerateInput {
  companyId: string;
  userId: string;
  joinDate: Date;
  yearCount?: number;
}

interface GenerateOutput {
  generated: number;
  skipped: number;
}

export class GenerateEmployeeAccrualsUseCase {
  constructor(
    private leaveAccrualRuleRepo: LeaveAccrualRuleRepo,
    private leaveAccrualRecordRepo: LeaveAccrualRecordRepo,
  ) {}

  async execute(input: GenerateInput): Promise<GenerateOutput> {
    const { companyId, userId, joinDate, yearCount = 5 } = input;

    if (!joinDate) return { generated: 0, skipped: 0 };

    const rules = await this.leaveAccrualRuleRepo.findActiveWithLeaveTypes(companyId);
    if (rules.length === 0) return { generated: 0, skipped: 0 };

    const startYear = joinDate.getFullYear();
    let generated = 0;
    let skipped = 0;

    for (let year = startYear; year < startYear + yearCount; year++) {
      const referenceDate = new Date(year, 0, 1);
      const periodStart = new Date(year, 0, 1);
      const periodEnd = new Date(year, 11, 31);

      for (const rule of rules) {
        const leaveTypeConfig = rule.leaveGroup.leaveTypeConfigs[0];
        if (!leaveTypeConfig) {
          skipped++;
          continue;
        }

        const tiers: AccrualTier[] = rule.tiers.map((t) => ({
          serviceMonthFrom: t.serviceMonthFrom,
          serviceMonthTo: t.serviceMonthTo,
          accrualDays: Number(t.accrualDays),
          validMonths: t.validMonths ?? undefined,
        }));

        // 중복 체크
        const existing = await this.leaveAccrualRecordRepo.findByUserAndRuleAndYear(
          companyId, userId, rule.id, year,
        );
        if (existing) {
          skipped++;
          continue;
        }

        const serviceMonths = calculateServiceMonths(joinDate, referenceDate);
        const matchedTier = findMatchingTier(serviceMonths, tiers);
        if (!matchedTier) {
          skipped++;
          continue;
        }

        // 일할 계산: 입사 첫 해 + FISCAL_YEAR 기준 + proRataFirstYear 설정
        let accrualDays = matchedTier.accrualDays;
        if (year === startYear && rule.accrualBasis === 'FISCAL_YEAR' && rule.proRataFirstYear) {
          accrualDays = calculateProRata(matchedTier.accrualDays, joinDate, periodStart, periodEnd);
        }

        if (accrualDays <= 0) {
          skipped++;
          continue;
        }

        const expiresAt = matchedTier.validMonths
          ? new Date(year, matchedTier.validMonths, 0)
          : null;

        await this.leaveAccrualRecordRepo.createWithBalanceUpdate(
          {
            companyId,
            userId,
            leaveTypeConfigId: leaveTypeConfig.id,
            accrualRuleId: rule.id,
            year,
            accrualDays,
            periodStart,
            periodEnd,
            expiresAt,
            source: 'RULE',
          },
          { companyId, userId, year, accrualDays },
        );

        generated++;
      }
    }

    return { generated, skipped };
  }
}
