import { prisma } from '../prisma/client';

export class WorkLocationRepository {
  async findAll(companyId: string) {
    return prisma.workLocation.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true, name: true, address: true,
        latitude: true, longitude: true, radiusMeters: true,
        isDefault: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllActive(companyId: string) {
    return prisma.workLocation.findMany({
      where: { companyId, deletedAt: null, isActive: true },
      select: {
        id: true, name: true, address: true,
        latitude: true, longitude: true, radiusMeters: true,
        isDefault: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.workLocation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async create(companyId: string, data: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    isDefault?: boolean;
  }) {
    return prisma.workLocation.create({
      data: {
        companyId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters ?? 100,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async update(companyId: string, id: string, data: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    const existing = await prisma.workLocation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.workLocation.update({
      where: { id },
      data,
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.workLocation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return;
    await prisma.workLocation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
