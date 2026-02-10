import { prisma } from '../prisma/client';

export class PaymentRepository {
  async findBySubscriptionId(subscriptionId: string, limit = 20) {
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

  async updateStatus(id: string, status: string, extra?: { paidAt?: Date; failReason?: string; receiptUrl?: string }) {
    return prisma.payment.update({
      where: { id },
      data: { status, ...extra } as Parameters<typeof prisma.payment.update>[0]['data'],
    });
  }
}
