import { prisma } from '../prisma/client';

export class PaymentRepository {
  async findBySubscriptionId(companyId: string, subscriptionId: string, limit = 20) {
    // Defense-in-depth: verify subscription belongs to company
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, companyId },
    });
    if (!subscription) return [];

    return prisma.payment.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(data: {
    subscriptionId: string;
    amount: number;
    status?: string;
    pgPaymentId?: string;
    description?: string;
    employeeCount?: number;
    periodStart?: Date;
    periodEnd?: Date;
    paidAt?: Date;
    failReason?: string;
    receiptUrl?: string;
  }) {
    return prisma.payment.create({
      data: data as Parameters<typeof prisma.payment.create>[0]['data'],
    });
  }

  async updateStatus(companyId: string, id: string, status: string, extra?: { paidAt?: Date; failReason?: string; receiptUrl?: string }) {
    // Verify payment belongs to company's subscription
    const payment = await prisma.payment.findFirst({
      where: { id },
      include: { subscription: { select: { companyId: true } } },
    });
    if (!payment || payment.subscription.companyId !== companyId) return null;

    return prisma.payment.update({
      where: { id },
      data: { status, ...extra } as Parameters<typeof prisma.payment.update>[0]['data'],
    });
  }
}
