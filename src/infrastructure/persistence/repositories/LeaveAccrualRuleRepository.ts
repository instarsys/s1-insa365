import { prisma } from '../prisma/client';

const RULE_INCLUDE = {
  leaveGroup: { select: { id: true, name: true } },
  tiers: { orderBy: { sortOrder: 'asc' as const } },
};

export class LeaveAccrualRuleRepository {
  async findAll(companyId: string) {
    return prisma.leaveAccrualRule.findMany({
      where: { companyId, deletedAt: null },
      include: RULE_INCLUDE,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.leaveAccrualRule.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async findByIdWithTiers(companyId: string, id: string) {
    return prisma.leaveAccrualRule.findFirst({
      where: { id, companyId, deletedAt: null },
      include: RULE_INCLUDE,
    });
  }

  async findByName(companyId: string, name: string) {
    return prisma.leaveAccrualRule.findFirst({
      where: { companyId, name, deletedAt: null },
    });
  }

  async createWithTiers(companyId: string, data: {
    name: string;
    leaveGroupId: string;
    accrualBasis: string;
    accrualUnit: string;
    proRataFirstYear: boolean;
    description?: string | null;
    tiers: Array<{
      serviceMonthFrom: number;
      serviceMonthTo: number;
      accrualDays: number;
      validMonths?: number | null;
      sortOrder: number;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.leaveAccrualRule.create({
        data: {
          companyId,
          name: data.name,
          leaveGroupId: data.leaveGroupId,
          accrualBasis: data.accrualBasis as Parameters<typeof tx.leaveAccrualRule.create>[0]['data']['accrualBasis'],
          accrualUnit: data.accrualUnit as Parameters<typeof tx.leaveAccrualRule.create>[0]['data']['accrualUnit'],
          proRataFirstYear: data.proRataFirstYear,
          description: data.description ?? null,
        },
      });

      await tx.leaveAccrualRuleTier.createMany({
        data: data.tiers.map((tier) => ({
          accrualRuleId: created.id,
          serviceMonthFrom: tier.serviceMonthFrom,
          serviceMonthTo: tier.serviceMonthTo,
          accrualDays: tier.accrualDays,
          validMonths: tier.validMonths ?? null,
          sortOrder: tier.sortOrder,
        })),
      });

      return tx.leaveAccrualRule.findUnique({
        where: { id: created.id },
        include: RULE_INCLUDE,
      });
    });
  }

  async updateWithTiers(companyId: string, id: string, data: Record<string, unknown>, tiers?: Array<{
    serviceMonthFrom: number;
    serviceMonthTo: number;
    accrualDays: number;
    validMonths?: number | null;
    sortOrder: number;
  }>) {
    const existing = await this.findById(companyId, id);
    if (!existing) return null;

    return prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};
      for (const key of ['name', 'leaveGroupId', 'accrualBasis', 'accrualUnit', 'proRataFirstYear', 'description']) {
        if (data[key] !== undefined) updateData[key] = data[key];
      }
      await tx.leaveAccrualRule.update({ where: { id }, data: updateData });

      if (tiers) {
        await tx.leaveAccrualRuleTier.deleteMany({ where: { accrualRuleId: id } });
        await tx.leaveAccrualRuleTier.createMany({
          data: tiers.map((tier) => ({
            accrualRuleId: id,
            ...tier,
            validMonths: tier.validMonths ?? null,
          })),
        });
      }

      return tx.leaveAccrualRule.findUnique({
        where: { id },
        include: RULE_INCLUDE,
      });
    });
  }

  /** 활성 규칙 조회 (발생 실행용) — leaveGroup.leaveTypeConfigs 포함 */
  async findActiveWithLeaveTypes(companyId: string, ruleId?: string) {
    return prisma.leaveAccrualRule.findMany({
      where: {
        companyId,
        deletedAt: null,
        isActive: true,
        ...(ruleId && { id: ruleId }),
      },
      include: {
        tiers: { orderBy: { sortOrder: 'asc' } },
        leaveGroup: {
          include: {
            leaveTypeConfigs: {
              where: { deletedAt: null, isActive: true },
              take: 1,
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await this.findById(companyId, id);
    if (!existing) return null;
    await prisma.leaveAccrualRule.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
