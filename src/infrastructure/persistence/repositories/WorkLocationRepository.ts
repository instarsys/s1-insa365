import { prisma } from '../prisma/client';

export class WorkLocationRepository {
  async findAll(companyId: string) {
    return prisma.workLocation.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.workLocation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }
}
