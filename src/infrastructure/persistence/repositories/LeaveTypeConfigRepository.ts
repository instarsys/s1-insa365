import { prisma } from '../prisma/client';

export class LeaveTypeConfigRepository {
  async findAll(companyId: string) {
    return prisma.leaveTypeConfig.findMany({
      where: { companyId, deletedAt: null },
      include: { leaveGroup: { select: { id: true, name: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.leaveTypeConfig.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async findByCode(companyId: string, code: string) {
    return prisma.leaveTypeConfig.findFirst({
      where: { companyId, code, deletedAt: null },
    });
  }

  async create(companyId: string, data: Record<string, unknown>) {
    return prisma.leaveTypeConfig.create({
      data: { ...data, companyId } as Parameters<typeof prisma.leaveTypeConfig.create>[0]['data'],
    });
  }

  async update(companyId: string, id: string, data: Record<string, unknown>) {
    const existing = await this.findById(companyId, id);
    if (!existing) return null;
    return prisma.leaveTypeConfig.update({ where: { id }, data });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await this.findById(companyId, id);
    if (!existing) return null;
    await prisma.leaveTypeConfig.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
