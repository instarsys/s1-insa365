import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { company: true, department: true, position: true },
    });
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { company: true, department: true, position: true },
    });
  }

  async updateRefreshToken(companyId: string, id: string, refreshToken: string | null) {
    const existing = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async updatePassword(companyId: string, id: string, password: string) {
    const existing = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.user.update({
      where: { id },
      data: { password },
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
      include: { company: true, department: true, position: true },
    });
  }

  async countActive(companyId: string) {
    return prisma.user.count({
      where: { companyId, employeeStatus: 'ACTIVE', deletedAt: null },
    });
  }

  async findManyByIds(companyId: string, ids: string[]) {
    return prisma.user.findMany({
      where: { companyId, id: { in: ids }, employeeStatus: 'ACTIVE', deletedAt: null },
    });
  }

  async findActiveUsers(companyId: string, ids?: string[]) {
    return prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        employeeStatus: 'ACTIVE',
        ...(ids && { id: { in: ids } }),
      },
      select: { id: true },
    });
  }

  /** 활성 직원 목록 (id + joinDate) — 연차 발생용 */
  async findActiveWithJoinDate(companyId: string) {
    return prisma.user.findMany({
      where: {
        companyId,
        employeeStatus: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true, joinDate: true },
    });
  }

  async countByDepartment(companyId: string, departmentId: string) {
    return prisma.user.count({
      where: { companyId, departmentId, deletedAt: null },
    });
  }

  async countByPosition(companyId: string, positionId: string) {
    return prisma.user.count({
      where: { companyId, positionId, deletedAt: null },
    });
  }

  async countByWorkPolicy(companyId: string, workPolicyId: string) {
    return prisma.user.count({
      where: { companyId, workPolicyId, deletedAt: null },
    });
  }

  async findByRefreshToken(refreshToken: string) {
    return prisma.user.findFirst({
      where: { refreshToken, deletedAt: null },
      include: { company: true },
    });
  }

  async findByIdForMe(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        employeeNumber: true, employeeStatus: true, joinDate: true,
        departmentId: true, positionId: true, companyId: true, dependents: true,
        company: { select: { id: true, name: true, businessNumber: true } },
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
    });
  }

  /** Super Admin 전용: 전역 사용자 목록 */
  async findAllGlobal(filters: { page?: number; limit?: number; search?: string; role?: string; companyId?: string } = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.role) where.role = filters.role as Prisma.EnumRoleFilter['equals'];
    if (filters.companyId) where.companyId = filters.companyId;
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { company: { select: { name: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findGlobalById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { company: true, department: true, position: true },
    });
  }

  async updateGlobal(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, include: { company: true } });
  }

  async countAll() {
    return prisma.user.count({ where: { deletedAt: null } });
  }

  /** 달력형 근태 조회용: 페이지네이션 + 기본 정보 */
  async findForCalendar(
    companyId: string,
    options: {
      employeeStatus?: string;
      departmentId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const where: Prisma.UserWhereInput = {
      companyId,
      deletedAt: null,
      ...(options.employeeStatus && { employeeStatus: options.employeeStatus as Prisma.EnumEmployeeStatusFilter['equals'] }),
      ...(options.departmentId && { departmentId: options.departmentId }),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  /** auth/me용: companyId 필터 포함, 프로필 전체 정보 */
  async findByIdAndCompanyForMe(companyId: string, id: string) {
    return prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        employeeNumber: true,
        employeeStatus: true,
        canViewSensitive: true,
        mustChangePassword: true,
        departmentId: true,
        positionId: true,
        profileImageUrl: true,
        joinDate: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  /** auth/refresh용: id + refreshToken으로 사용자 조회 */
  async findByIdAndRefreshToken(id: string, refreshToken: string) {
    return prisma.user.findFirst({
      where: { id, refreshToken, deletedAt: null },
    });
  }
}
