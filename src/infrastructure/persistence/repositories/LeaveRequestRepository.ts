import { prisma } from '../prisma/client';
import type { Prisma, LeaveStatus, LeaveType } from '@/generated/prisma/client';

export interface LeaveRequestFilters {
  userId?: string;
  status?: LeaveStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class LeaveRequestRepository {
  async findById(companyId: string, id: string) {
    return prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { user: { include: { department: true, position: true } } },
    });
  }

  async findAll(companyId: string, filters: LeaveRequestFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: Prisma.LeaveRequestWhereInput = { companyId, deletedAt: null };

    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = filters.startDate;
      if (filters.endDate) where.startDate.lte = filters.endDate;
    }

    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: { user: { include: { department: true, position: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(companyId: string, data: Prisma.LeaveRequestUncheckedCreateInput) {
    return prisma.leaveRequest.create({
      data: { ...data, companyId },
      include: { user: { include: { department: true, position: true } } },
    });
  }

  async update(companyId: string, id: string, data: Prisma.LeaveRequestUpdateInput) {
    const existing = await prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.leaveRequest.update({
      where: { id },
      data,
      include: { user: { include: { department: true, position: true } } },
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { leaveTypeConfig: { select: { deductsFromBalance: true } } },
    });
    if (!existing) return null;
    await prisma.leaveRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return existing;
  }

  async countPending(companyId: string) {
    return prisma.leaveRequest.count({
      where: { companyId, status: 'PENDING', deletedAt: null },
    });
  }

  async findByIdWithConfig(companyId: string, id: string) {
    return prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        user: { include: { department: true, position: true } },
        leaveTypeConfig: { select: { deductsFromBalance: true } },
      },
    });
  }

  async findAllWithConfig(companyId: string, filters: LeaveRequestFilters & { leaveType?: string } = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: Prisma.LeaveRequestWhereInput = { companyId, deletedAt: null };
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.leaveType) where.type = filters.leaveType as LeaveType;
    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = filters.startDate;
      if (filters.endDate) where.startDate.lte = filters.endDate;
    }
    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: { include: { department: true, position: true } },
          leaveTypeConfig: { include: { leaveGroup: { select: { id: true, name: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.leaveRequest.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findByYear(companyId: string, year: number, filters: { userId?: string; departmentId?: string } = {}) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    const where: Prisma.LeaveRequestWhereInput = {
      companyId,
      deletedAt: null,
      startDate: { gte: startOfYear, lte: endOfYear },
    };
    if (filters.userId) where.userId = filters.userId;
    if (filters.departmentId) where.user = { departmentId: filters.departmentId };
    return prisma.leaveRequest.findMany({
      where,
      include: {
        user: { include: { department: true } },
        leaveTypeConfig: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /** history type 뷰: leaveTypeConfig 기준 그룹핑용 */
  async findByYearForTypeView(companyId: string, year: number, filters: { userId?: string; departmentId?: string } = {}) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const where: Prisma.LeaveRequestWhereInput = {
      companyId,
      deletedAt: null,
      startDate: { gte: yearStart },
      endDate: { lte: yearEnd },
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.departmentId && { user: { departmentId: filters.departmentId } }),
    };
    return prisma.leaveRequest.findMany({
      where,
      include: {
        leaveTypeConfig: { select: { id: true, code: true, name: true } },
        user: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /** history monthly 뷰: 월별 그리드용 */
  async findByYearForMonthlyView(companyId: string, year: number, filters: { userId?: string; departmentId?: string } = {}) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const where: Prisma.LeaveRequestWhereInput = {
      companyId,
      deletedAt: null,
      startDate: { gte: yearStart },
      endDate: { lte: yearEnd },
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.departmentId && { user: { departmentId: filters.departmentId } }),
    };
    return prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } },
          },
        },
        leaveTypeConfig: { select: { code: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /** history list 뷰: 전체 목록 (leaveTypeConfig + employeeNumber 포함) */
  async findByYearForListView(companyId: string, year: number, filters: { userId?: string; departmentId?: string } = {}) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const where: Prisma.LeaveRequestWhereInput = {
      companyId,
      deletedAt: null,
      startDate: { gte: yearStart },
      endDate: { lte: yearEnd },
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.departmentId && { user: { departmentId: filters.departmentId } }),
    };
    return prisma.leaveRequest.findMany({
      where,
      include: {
        leaveTypeConfig: { select: { id: true, code: true, name: true } },
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 특정 사용자+연도 승인된 휴가 조회 (원장용) */
  async findApprovedByUserAndYear(companyId: string, userId: string, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    return prisma.leaveRequest.findMany({
      where: {
        companyId,
        userId,
        status: 'APPROVED',
        deletedAt: null,
        startDate: { gte: startOfYear, lte: endOfYear },
      },
      include: {
        leaveTypeConfig: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /** 기간별 승인된 휴가 조회 (결근 자동 생성 시 휴가 제외용) */
  async findApprovedByPeriod(
    companyId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return prisma.leaveRequest.findMany({
      where: {
        companyId,
        userId,
        status: 'APPROVED',
        deletedAt: null,
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { startDate: { lte: startDate }, endDate: { gte: endDate } },
        ],
      },
      select: {
        startDate: true,
        endDate: true,
        type: true,
        leaveTypeConfig: { select: { name: true, deductsFromBalance: true } },
      },
    });
  }

  /** 기간 내 미처리(PENDING) 휴가 조회 (급여 확정 차단용) */
  async findPendingByPeriod(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: 'PENDING',
        deletedAt: null,
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { startDate: { lte: startDate }, endDate: { gte: endDate } },
        ],
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        user: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /** requests 페이지: leaveGroup 포함 조회 + 페이지네이션 + 유형 필터 */
  async findAllWithGroupAndPagination(
    companyId: string,
    filters: {
      userId?: string;
      status?: LeaveStatus;
      type?: string;
      departmentId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: Prisma.LeaveRequestWhereInput = {
      companyId,
      deletedAt: null,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.type && { type: filters.type as LeaveType }),
      ...(filters.departmentId && { user: { departmentId: filters.departmentId } }),
    };
    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeNumber: true,
              department: { select: { name: true } },
            },
          },
          leaveTypeConfig: {
            select: {
              id: true,
              code: true,
              name: true,
              leaveGroup: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
