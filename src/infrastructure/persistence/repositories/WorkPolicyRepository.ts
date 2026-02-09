import { prisma } from '../prisma/client';

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

  async create(companyId: string, data: {
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    workDays?: string;
    isDefault?: boolean;
  }) {
    return prisma.workPolicy.create({
      data: {
        companyId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        breakMinutes: data.breakMinutes ?? 60,
        workDays: data.workDays ?? '1,2,3,4,5',
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async update(companyId: string, id: string, data: Partial<{
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    workDays: string;
    isDefault: boolean;
  }>) {
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
