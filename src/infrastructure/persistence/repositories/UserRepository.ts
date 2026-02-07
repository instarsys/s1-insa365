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
}
