import { prisma } from '../prisma/client';

export class LeaveGroupRepository {
  async findAll(companyId: string) {
    const items = await prisma.leaveGroup.findMany({
      where: { companyId, deletedAt: null },
      include: {
        leaveTypeConfigs: { where: { deletedAt: null }, select: { id: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return items.map((g) => ({
      ...g,
      _count: { leaveTypeConfigs: g.leaveTypeConfigs.length },
      leaveTypeConfigs: undefined,
    }));
  }

  async findById(companyId: string, id: string) {
    return prisma.leaveGroup.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async findByName(companyId: string, name: string) {
    return prisma.leaveGroup.findFirst({
      where: { companyId, name, deletedAt: null },
    });
  }

  async create(companyId: string, data: { name: string; allowOveruse: boolean; description?: string | null; sortOrder: number }) {
    return prisma.leaveGroup.create({
      data: { companyId, name: data.name, allowOveruse: data.allowOveruse, description: data.description ?? null, sortOrder: data.sortOrder },
    });
  }

  async update(companyId: string, id: string, data: Record<string, unknown>) {
    const existing = await this.findById(companyId, id);
    if (!existing) return null;
    return prisma.leaveGroup.update({ where: { id }, data });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await this.findById(companyId, id);
    if (!existing) return null;
    await prisma.leaveGroup.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
