import { prisma } from '../prisma/client';
import type { CreateWorkPolicyData } from '@/application/ports/IWorkPolicyRepository';

export class WorkPolicyRepository {
  async findById(companyId: string, id: string) {
    return prisma.workPolicy.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async findAll(companyId: string) {
    return prisma.workPolicy.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findDefault(companyId: string) {
    return prisma.workPolicy.findFirst({
      where: { companyId, isDefault: true, deletedAt: null },
    });
  }

  async create(companyId: string, data: CreateWorkPolicyData) {
    return prisma.workPolicy.create({
      data: {
        companyId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        breakMinutes: data.breakMinutes ?? 60,
        workDays: data.workDays ?? '1,2,3,4,5',
        isDefault: data.isDefault ?? false,
        lateGraceMinutes: data.lateGraceMinutes ?? 0,
        earlyLeaveGraceMinutes: data.earlyLeaveGraceMinutes ?? 0,
        nightWorkStartTime: data.nightWorkStartTime ?? '22:00',
        nightWorkEndTime: data.nightWorkEndTime ?? '06:00',
        overtimeThresholdMinutes: data.overtimeThresholdMinutes ?? 480,
        monthlyWorkHours: data.monthlyWorkHours ?? 209,
        weeklyHoliday: data.weeklyHoliday ?? '0',
        weeklyWorkHours: data.weeklyWorkHours ?? 40,
        weeklyOvertimeLimit: data.weeklyOvertimeLimit ?? 12,
        monthlyOvertimeLimit: data.monthlyOvertimeLimit ?? 52,
      },
    });
  }

  async update(companyId: string, id: string, data: Partial<CreateWorkPolicyData>) {
    const existing = await prisma.workPolicy.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.workPolicy.update({ where: { id }, data });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.workPolicy.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return;
    await prisma.workPolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAllWithUserCount(companyId: string) {
    return prisma.workPolicy.findMany({
      where: { companyId, deletedAt: null },
      include: { _count: { select: { users: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async unsetDefault(companyId: string) {
    await prisma.workPolicy.updateMany({
      where: { companyId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }

  async unsetDefaultExcept(companyId: string, excludeId: string) {
    await prisma.workPolicy.updateMany({
      where: { companyId, isDefault: true, deletedAt: null, NOT: { id: excludeId } },
      data: { isDefault: false },
    });
  }
}
