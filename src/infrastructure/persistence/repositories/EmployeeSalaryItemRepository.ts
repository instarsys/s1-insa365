import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { SalaryItemType, PaymentType, PaymentCycle } from '@/generated/prisma/client';

export class EmployeeSalaryItemRepository {
  async findByEmployee(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, userId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findActiveByEmployee(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, userId, isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: {
    companyId: string;
    userId: string;
    code: string;
    name: string;
    type: string;
    paymentType?: string;
    paymentCycle?: string;
    amount?: number;
    isOrdinaryWage?: boolean;
    isTaxExempt?: boolean;
    taxExemptCode?: string;
    isActive?: boolean;
    sortOrder?: number;
    formula?: string;
  }) {
    return prisma.employeeSalaryItem.create({ data: data as Prisma.EmployeeSalaryItemUncheckedCreateInput });
  }

  async createMany(items: Prisma.EmployeeSalaryItemCreateManyInput[]) {
    const result = await prisma.employeeSalaryItem.createMany({ data: items });
    return result.count;
  }

  async update(companyId: string, id: string, data: Prisma.EmployeeSalaryItemUpdateInput) {
    const existing = await prisma.employeeSalaryItem.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.employeeSalaryItem.update({
      where: { id },
      data,
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.employeeSalaryItem.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.employeeSalaryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deleteByEmployee(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.updateMany({
      where: { companyId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async findByUserOrdered(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, userId, deletedAt: null },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async toggleActive(companyId: string, id: string, isActive: boolean) {
    const existing = await prisma.employeeSalaryItem.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.employeeSalaryItem.update({
      where: { id },
      data: { isActive },
    });
  }

  async updateManyInTransaction(companyId: string, updates: Array<{ id: string; data: Prisma.EmployeeSalaryItemUpdateInput }>) {
    return prisma.$transaction(async (tx) => {
      const results = [];
      for (const u of updates) {
        const existing = await tx.employeeSalaryItem.findFirst({
          where: { id: u.id, companyId, deletedAt: null },
        });
        if (!existing) {
          throw new Error(`급여 항목(${u.id})을 찾을 수 없거나 접근 권한이 없습니다.`);
        }
        results.push(await tx.employeeSalaryItem.update({ where: { id: u.id }, data: u.data }));
      }
      return results;
    });
  }

  async findByCodes(companyId: string, codes: string[]) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, code: { in: codes }, deletedAt: null },
      select: { userId: true, code: true },
    });
  }

  async updateFormulaByCode(companyId: string, code: string, formula: string | null) {
    const result = await prisma.employeeSalaryItem.updateMany({
      where: { companyId, code, deletedAt: null },
      data: { formula },
    });
    return result.count;
  }

  /** 모드 A: 동기화 — 금액 보존, 속성 업데이트 + 누락 항목 추가 */
  async upsertFromRules(
    companyId: string,
    userId: string,
    rules: Array<{
      code: string; name: string; type: SalaryItemType;
      paymentType: PaymentType; paymentCycle: PaymentCycle;
      defaultAmount: number; isOrdinaryWage: boolean;
      isTaxExempt: boolean; taxExemptCode: string | null;
      sortOrder: number; formula: string | null;
    }>,
  ): Promise<{ created: number; updated: number; deleted: number }> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.employeeSalaryItem.findMany({
        where: { companyId, userId, deletedAt: null },
      });
      const existingByCode = new Map(existing.map(item => [item.code, item]));
      const ruleCodes = new Set(rules.map(r => r.code));

      let created = 0;
      let updated = 0;
      let deleted = 0;

      for (const rule of rules) {
        const item = existingByCode.get(rule.code);
        if (item) {
          await tx.employeeSalaryItem.update({
            where: { id: item.id },
            data: {
              name: rule.name,
              type: rule.type,
              paymentType: rule.paymentType,
              paymentCycle: rule.paymentCycle,
              isOrdinaryWage: rule.isOrdinaryWage,
              isTaxExempt: rule.isTaxExempt,
              taxExemptCode: rule.taxExemptCode,
              sortOrder: rule.sortOrder,
              formula: rule.formula,
            },
          });
          updated++;
        } else {
          await tx.employeeSalaryItem.create({
            data: {
              companyId,
              userId,
              code: rule.code,
              name: rule.name,
              type: rule.type,
              paymentType: rule.paymentType,
              paymentCycle: rule.paymentCycle,
              amount: rule.defaultAmount,
              isOrdinaryWage: rule.isOrdinaryWage,
              isTaxExempt: rule.isTaxExempt,
              taxExemptCode: rule.taxExemptCode,
              sortOrder: rule.sortOrder,
              formula: rule.formula,
            } as Prisma.EmployeeSalaryItemUncheckedCreateInput,
          });
          created++;
        }
      }

      // 삭제된 규칙에 해당하는 항목 soft-delete
      for (const item of existing) {
        if (!ruleCodes.has(item.code)) {
          await tx.employeeSalaryItem.update({
            where: { id: item.id },
            data: { deletedAt: new Date() },
          });
          deleted++;
        }
      }

      return { created, updated, deleted };
    });
  }

}
