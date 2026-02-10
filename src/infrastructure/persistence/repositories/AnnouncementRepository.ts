import { prisma } from '../prisma/client';

export class AnnouncementRepository {
  async findAll(companyId: string, limit = 10) {
    return prisma.announcement.findMany({
      where: {
        deletedAt: null,
        OR: [
          { companyId: null },
          { companyId },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  async create(data: {
    companyId?: string | null;
    category: 'NEWS' | 'NEW_FEATURE' | 'NOTICE' | 'UPDATE';
    title: string;
    content?: string | null;
    isNew?: boolean;
  }) {
    return prisma.announcement.create({ data });
  }

  async softDelete(id: string) {
    return prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
