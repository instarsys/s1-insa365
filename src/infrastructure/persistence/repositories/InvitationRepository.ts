import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class InvitationRepository {
  async findAll(companyId: string, status?: string) {
    const where: Prisma.EmployeeInvitationWhereInput = { companyId };
    if (status) {
      where.status = status as Prisma.EnumInvitationStatusFilter['equals'];
    }
    return prisma.employeeInvitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.employeeInvitation.findFirst({
      where: { id, companyId },
    });
  }

  async findByCode(code: string) {
    return prisma.employeeInvitation.findUnique({
      where: { inviteCode: code },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async create(data: Prisma.EmployeeInvitationUncheckedCreateInput) {
    return prisma.employeeInvitation.create({ data });
  }

  async update(id: string, data: Prisma.EmployeeInvitationUncheckedUpdateInput) {
    return prisma.employeeInvitation.update({
      where: { id },
      data,
    });
  }

  async cancel(companyId: string, id: string) {
    const existing = await prisma.employeeInvitation.findFirst({
      where: { id, companyId, status: { in: ['PENDING', 'SENT'] } },
    });
    if (!existing) return null;
    return prisma.employeeInvitation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async codeExists(code: string) {
    const record = await prisma.employeeInvitation.findUnique({ where: { inviteCode: code } });
    return !!record;
  }
}
