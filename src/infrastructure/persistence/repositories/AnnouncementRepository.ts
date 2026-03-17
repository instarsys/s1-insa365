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

  async softDelete(companyId: string | null, id: string) {
    // companyId=null → 시스템 공지 (SYSTEM_ADMIN만), otherwise → 해당 회사 공지
    const existing = await prisma.announcement.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
