import { prisma } from '../prisma/client';

export class SubscriptionRepository {
  async findByCompanyId(companyId: string) {
    return prisma.subscription.findUnique({
      where: { companyId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async upsert(companyId: string, data: {
    plan?: string;
    status?: string;
    trialEndsAt?: Date | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    maxEmployees?: number;
    pricePerEmployee?: number;
    billingKey?: string | null;
    lastCardDigits?: string | null;
    cardBrand?: string | null;
    pgCustomerId?: string | null;
  }) {
    return prisma.subscription.upsert({
      where: { companyId },
      create: {
        companyId,
        ...data,
      } as Parameters<typeof prisma.subscription.create>[0]['data'],
      update: data as Parameters<typeof prisma.subscription.update>[0]['data'],
    });
  }

  async update(companyId: string, data: Record<string, unknown>) {
    return prisma.subscription.update({
      where: { companyId },
      data: data as Parameters<typeof prisma.subscription.update>[0]['data'],
    });
  }
}
