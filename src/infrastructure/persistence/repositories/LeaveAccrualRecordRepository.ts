import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class LeaveAccrualRecordRepository {
  async findAll(companyId: string, filters: { year?: number; userId?: string; departmentId?: string } = {}) {
    return prisma.leaveAccrualRecord.findMany({
      where: {
        companyId,
        ...(filters.year && { year: filters.year }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.departmentId && { user: { departmentId: filters.departmentId } }),
      },
      include: {
        user: { select: { id: true, name: true, joinDate: true, department: { select: { name: true } } } },
        leaveTypeConfig: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserAndTypeAndPeriod(companyId: string, userId: string, leaveTypeConfigId: string, periodStart: Date) {
    return prisma.leaveAccrualRecord.findFirst({
      where: { companyId, userId, leaveTypeConfigId, periodStart },
    });
  }

  async create(data: Prisma.LeaveAccrualRecordUncheckedCreateInput) {
    return prisma.leaveAccrualRecord.create({ data });
  }

  async createMany(data: Prisma.LeaveAccrualRecordCreateManyInput[]) {
    return prisma.leaveAccrualRecord.createMany({ data });
  }

  /** 특정 사용자+규칙+연도로 기존 발생 레코드 조회 */
  async findByUserAndRuleAndYear(companyId: string, userId: string, accrualRuleId: string, year: number) {
    return prisma.leaveAccrualRecord.findFirst({
      where: { companyId, userId, accrualRuleId, year },
    });
  }

  /** 특정 사용자+연도 발생 레코드 전체 조회 (원장용) */
  async findByUserAndYear(companyId: string, userId: string, year: number) {
    return prisma.leaveAccrualRecord.findMany({
      where: { companyId, userId, year },
      include: {
        accrualRule: { select: { name: true } },
        leaveTypeConfig: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** 연차 발생 트랜잭션: 레코드 생성 + 잔여일수 upsert */
  async createWithBalanceUpdate(
    data: Prisma.LeaveAccrualRecordUncheckedCreateInput,
    balanceData: { companyId: string; userId: string; year: number; accrualDays: number },
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.leaveAccrualRecord.create({ data });
      await tx.leaveBalance.upsert({
        where: {
          companyId_userId_year: {
            companyId: balanceData.companyId,
            userId: balanceData.userId,
            year: balanceData.year,
          },
        },
        create: {
          companyId: balanceData.companyId,
          userId: balanceData.userId,
          year: balanceData.year,
          totalDays: balanceData.accrualDays,
          remainingDays: balanceData.accrualDays,
        },
        update: {
          totalDays: { increment: balanceData.accrualDays },
          remainingDays: { increment: balanceData.accrualDays },
        },
      });
    });
  }
}
