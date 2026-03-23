import { prisma } from '../prisma/client';
import type { PayslipEmailStatus } from '@/generated/prisma/client';

export class PayslipEmailLogRepository {
  async create(data: {
    companyId: string;
    userId: string;
    payrollMonthlyId: string;
    year: number;
    month: number;
    recipientEmail: string;
    trackingToken: string;
    sentByUserId: string;
  }) {
    return prisma.payslipEmailLog.create({ data });
  }

  async findByPeriod(companyId: string, year: number, month: number) {
    return prisma.payslipEmailLog.findMany({
      where: { companyId, year, month },
      include: {
        user: {
          select: {
            name: true,
            employeeNumber: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByToken(trackingToken: string) {
    return prisma.payslipEmailLog.findUnique({ where: { trackingToken } });
  }

  async updateStatus(
    id: string,
    status: PayslipEmailStatus,
    extra: {
      sentAt?: Date;
      openedAt?: Date;
      resendMessageId?: string;
      failReason?: string;
    } = {},
  ) {
    return prisma.payslipEmailLog.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  async findLatestByUserAndPeriod(
    companyId: string,
    userId: string,
    year: number,
    month: number,
  ) {
    return prisma.payslipEmailLog.findFirst({
      where: { companyId, userId, year, month },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * SECURITY DEFINER 함수로 RLS를 우회하여 열람 상태 업데이트.
   * 트래킹 픽셀 엔드포인트(인증 없음)에서 호출.
   */
  async recordOpen(trackingToken: string): Promise<boolean> {
    const result = await prisma.$queryRaw<{ record_payslip_email_open: boolean }[]>`
      SELECT record_payslip_email_open(${trackingToken})
    `;
    return result[0]?.record_payslip_email_open ?? false;
  }
}
