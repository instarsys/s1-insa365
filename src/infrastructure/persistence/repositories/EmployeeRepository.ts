import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class EmployeeRepository {
  async findById(companyId: string, id: string) {
    return prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { department: true, position: true },
    });
  }

  async findAll(companyId: string, filters: EmployeeFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: Prisma.UserWhereInput = { companyId, deletedAt: null };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { employeeNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.status) where.employeeStatus = filters.status as Prisma.EnumEmployeeStatusFilter['equals'];

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { department: true, position: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(companyId: string, data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: { ...data, company: { connect: { id: companyId } } },
      include: { department: true, position: true },
    });
  }

  async update(companyId: string, id: string, data: Prisma.UserUpdateInput) {
    const existing = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.user.update({
      where: { id },
      data,
      include: { department: true, position: true },
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), employeeStatus: 'RESIGNED' },
    });
  }

  async findByEmail(companyId: string, email: string) {
    return prisma.user.findFirst({
      where: { companyId, email, deletedAt: null },
    });
  }

  async getNextEmployeeNumber(companyId: string, prefix: string) {
    const lastEmployee = await prisma.user.findFirst({
      where: { companyId, employeeNumber: { startsWith: `E${prefix}` } },
      orderBy: { employeeNumber: 'desc' },
    });
    const lastNum = lastEmployee?.employeeNumber
      ? parseInt(lastEmployee.employeeNumber.slice(2), 10)
      : 0;
    return `E${prefix}${String(lastNum + 1).padStart(4, '0')}`;
  }
}
