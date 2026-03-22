import { prisma } from '../prisma/client';

export class PayrollGroupRepository {
  async findAll(companyId: string) {
    return prisma.payrollGroup.findMany({
      where: { companyId, deletedAt: null },
      include: {
        _count: { select: { users: { where: { deletedAt: null } } } },
        payrollGroupManagers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.payrollGroup.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        _count: { select: { users: { where: { deletedAt: null } } } },
        payrollGroupManagers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async findDefault(companyId: string) {
    return prisma.payrollGroup.findFirst({
      where: { companyId, isDefault: true, deletedAt: null },
    });
  }

  async create(data: {
    companyId: string;
    name: string;
    code?: string;
    payDay?: number;
    description?: string;
    sortOrder?: number;
    isDefault?: boolean;
  }) {
    return prisma.payrollGroup.create({ data });
  }

  async update(companyId: string, id: string, data: {
    name?: string;
    code?: string;
    payDay?: number;
    description?: string;
    sortOrder?: number;
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    const existing = await prisma.payrollGroup.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.payrollGroup.update({ where: { id }, data });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.payrollGroup.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    if (existing.isDefault) return null; // 기본 그룹은 삭제 불가
    return prisma.payrollGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 그룹 관리자 배정/해제
  async addManager(companyId: string, payrollGroupId: string, userId: string) {
    return prisma.payrollGroupManager.upsert({
      where: { payrollGroupId_userId: { payrollGroupId, userId } },
      update: {},
      create: { companyId, payrollGroupId, userId },
    });
  }

  async removeManager(companyId: string, payrollGroupId: string, userId: string) {
    const existing = await prisma.payrollGroupManager.findFirst({
      where: { companyId, payrollGroupId, userId },
    });
    if (!existing) return null;
    return prisma.payrollGroupManager.delete({ where: { id: existing.id } });
  }

  async findManagedGroups(userId: string) {
    const managers = await prisma.payrollGroupManager.findMany({
      where: { userId },
      include: { payrollGroup: true },
    });
    return managers.map(m => m.payrollGroup);
  }

  // 그룹 멤버 배정
  async assignMembers(companyId: string, payrollGroupId: string, userIds: string[]) {
    return prisma.user.updateMany({
      where: { id: { in: userIds }, companyId, deletedAt: null },
      data: { payrollGroupId },
    });
  }

  async unassignMembers(companyId: string, userIds: string[]) {
    return prisma.user.updateMany({
      where: { id: { in: userIds }, companyId, deletedAt: null },
      data: { payrollGroupId: null },
    });
  }

  async getMembers(companyId: string, payrollGroupId: string) {
    return prisma.user.findMany({
      where: { companyId, payrollGroupId, deletedAt: null },
      select: { id: true, name: true, email: true, employeeNumber: true, department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
