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
        { email: { contains: filters.search, mode: 'insensitive' } },
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

  async softDelete(companyId: string, id: string, resignDate?: Date, resignReason?: string) {
    const existing = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        employeeStatus: 'RESIGNED',
        ...(resignDate && { resignDate }),
        ...(resignReason && { resignReason }),
      },
    });
  }

  async terminate(companyId: string, id: string, resignDate: Date, resignReason?: string) {
    const existing = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return;
    await prisma.user.update({
      where: { id },
      data: {
        employeeStatus: 'RESIGNED',
        resignDate,
        ...(resignReason && { resignReason }),
      },
    });
  }

  async rehire(companyId: string, id: string, rehireDate?: Date) {
    const existing = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return;
    await prisma.user.update({
      where: { id },
      data: {
        employeeStatus: 'ACTIVE',
        resignDate: null,
        resignReason: null,
        ...(rehireDate && { joinDate: rehireDate }),
      },
    });
  }

  async countByStatus(companyId: string, status: string) {
    return prisma.user.count({
      where: {
        companyId,
        employeeStatus: status as Prisma.EnumEmployeeStatusFilter['equals'],
        deletedAt: null,
      },
    });
  }

  /** 부서별 활성 직원 수 (리포트용) */
  async countByDepartment(companyId: string) {
    const result = await prisma.user.groupBy({
      by: ['departmentId'],
      where: {
        companyId,
        deletedAt: null,
        employeeStatus: 'ACTIVE',
      },
      _count: true,
    });
    return new Map(result.map((r) => [r.departmentId, r._count]));
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

  async findByIdWithDetails(companyId: string, id: string) {
    return prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        company: true,
        department: true,
        position: true,
        workPolicy: true,
        workLocation: true,
        employeeSalaryItems: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async createUnchecked(companyId: string, data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({
      data: { ...data, companyId },
      include: { department: true, position: true },
    });
  }

  /** 전체 직원 조회 (엑셀 내보내기용, 페이지네이션 없음) */
  async findAllForExport(companyId: string) {
    return prisma.user.findMany({
      where: { companyId, deletedAt: null, employeeStatus: 'ACTIVE' },
      include: { department: true, position: true },
      orderBy: { employeeNumber: 'asc' },
    });
  }

  /** 사번으로 직원 찾기 */
  async findByEmployeeNumber(companyId: string, employeeNumber: string) {
    return prisma.user.findFirst({
      where: { companyId, employeeNumber, deletedAt: null },
      include: { department: true, position: true },
    });
  }

  /** 관리 필요 직원 5가지 알림 카운트 */
  async getManagementAlerts(companyId: string) {
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const [resigningSoon, noLocation, onLeaveCount] = await Promise.all([
      // 1달 내 퇴사 예정
      prisma.user.count({
        where: {
          companyId,
          deletedAt: null,
          employeeStatus: 'ACTIVE',
          resignDate: { gte: now, lte: oneMonthLater },
        },
      }),
      // 근무지 미배정
      prisma.user.count({
        where: {
          companyId,
          deletedAt: null,
          employeeStatus: 'ACTIVE',
          workLocationId: null,
        },
      }),
      // 휴직 중
      prisma.user.count({
        where: {
          companyId,
          deletedAt: null,
          employeeStatus: 'ON_LEAVE',
        },
      }),
    ]);

    return {
      resigningSoon,
      noLocation,
      onLeave: onLeaveCount,
      total: resigningSoon + noLocation + onLeaveCount,
    };
  }
}
