import { ValidationError } from '@domain/errors/ValidationError';
import { EntityNotFoundError } from '@domain/errors/EntityNotFoundError';
import { randomUUID } from 'crypto';

interface PayslipEmailLogRepo {
  create(data: {
    companyId: string;
    userId: string;
    payrollMonthlyId: string;
    year: number;
    month: number;
    recipientEmail: string;
    trackingToken: string;
    sentByUserId: string;
  }): Promise<{ id: string }>;
  updateStatus(
    id: string,
    status: string,
    extra?: { sentAt?: Date; openedAt?: Date; resendMessageId?: string; failReason?: string },
  ): Promise<unknown>;
}

interface PayrollMonthlyRepo {
  findByEmployeeAndPeriod(
    companyId: string,
    userId: string,
    year: number,
    month: number,
  ): Promise<{
    id: string;
    employeeName: string | null;
    employeeNumber: string | null;
    departmentName: string | null;
    totalPay: unknown;
    nationalPension: unknown;
    healthInsurance: unknown;
    longTermCare: unknown;
    employmentInsurance: unknown;
    incomeTax: unknown;
    localIncomeTax: unknown;
    netPay: unknown;
    payItemsSnapshot: unknown;
    deductionItemsSnapshot: unknown;
  } | null>;
}

interface CompanyRepo {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

interface UserRepo {
  findById(id: string): Promise<{ id: string; name: string; email: string } | null>;
}

interface AuditLogRepo {
  create(data: {
    companyId: string;
    userId: string;
    action: string;
    entityType: string;
    after?: unknown;
  }): Promise<unknown>;
}

interface EmailServicePort {
  sendPayslipEmail(params: {
    to: string;
    employeeName: string;
    companyName: string;
    year: number;
    month: number;
    trackingToken: string;
    htmlContent: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

interface TemplateBuilderPort {
  buildHtml(params: {
    companyName: string;
    employeeName: string;
    employeeNumber: string;
    departmentName: string;
    year: number;
    month: number;
    payItems: unknown[];
    deductionItems: unknown[];
    totalPay: number;
    totalDeduction: number;
    netPay: number;
  }): string;
}

interface SendResult {
  userId: string;
  success: boolean;
  error?: string;
}

export class SendPayslipEmailUseCase {
  constructor(
    private payslipEmailLogRepo: PayslipEmailLogRepo,
    private payrollMonthlyRepo: PayrollMonthlyRepo,
    private companyRepo: CompanyRepo,
    private userRepo: UserRepo,
    private auditLogRepo: AuditLogRepo,
    private emailService: EmailServicePort,
    private templateBuilder: TemplateBuilderPort,
  ) {}

  async execute(params: {
    companyId: string;
    year: number;
    month: number;
    userIds: string[];
    sentByUserId: string;
  }): Promise<{ sentCount: number; failedCount: number; results: SendResult[] }> {
    if (params.userIds.length === 0) {
      throw new ValidationError('발송할 직원을 선택해주세요.');
    }

    const company = await this.companyRepo.findById(params.companyId);
    if (!company) throw new EntityNotFoundError('Company', params.companyId);

    const results: SendResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const userId of params.userIds) {
      const monthly = await this.payrollMonthlyRepo.findByEmployeeAndPeriod(
        params.companyId,
        userId,
        params.year,
        params.month,
      );
      if (!monthly) {
        results.push({ userId, success: false, error: '확정된 급여 데이터가 없습니다.' });
        failedCount++;
        continue;
      }

      const user = await this.userRepo.findById(userId);
      if (!user?.email) {
        results.push({ userId, success: false, error: '직원 이메일이 없습니다.' });
        failedCount++;
        continue;
      }

      const trackingToken = randomUUID();

      const log = await this.payslipEmailLogRepo.create({
        companyId: params.companyId,
        userId,
        payrollMonthlyId: monthly.id,
        year: params.year,
        month: params.month,
        recipientEmail: user.email,
        trackingToken,
        sentByUserId: params.sentByUserId,
      });

      const totalDeduction =
        Number(monthly.nationalPension) +
        Number(monthly.healthInsurance) +
        Number(monthly.longTermCare) +
        Number(monthly.employmentInsurance) +
        Number(monthly.incomeTax) +
        Number(monthly.localIncomeTax);

      const htmlContent = this.templateBuilder.buildHtml({
        companyName: company.name,
        employeeName: monthly.employeeName || user.name,
        employeeNumber: monthly.employeeNumber || '',
        departmentName: monthly.departmentName || '',
        year: params.year,
        month: params.month,
        payItems: (monthly.payItemsSnapshot as unknown[]) || [],
        deductionItems: (monthly.deductionItemsSnapshot as unknown[]) || [],
        totalPay: Number(monthly.totalPay),
        totalDeduction,
        netPay: Number(monthly.netPay),
      });

      const sendResult = await this.emailService.sendPayslipEmail({
        to: user.email,
        employeeName: monthly.employeeName || user.name,
        companyName: company.name,
        year: params.year,
        month: params.month,
        trackingToken,
        htmlContent,
      });

      if (sendResult.success) {
        await this.payslipEmailLogRepo.updateStatus(log.id, 'SENT', {
          sentAt: new Date(),
          resendMessageId: sendResult.messageId,
        });
        sentCount++;
        results.push({ userId, success: true });
      } else {
        await this.payslipEmailLogRepo.updateStatus(log.id, 'FAILED', {
          failReason: sendResult.error,
        });
        failedCount++;
        results.push({ userId, success: false, error: sendResult.error });
      }

      // Rate limit 대응: 여러 명 발송 시 100ms 딜레이
      if (params.userIds.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    await this.auditLogRepo.create({
      companyId: params.companyId,
      userId: params.sentByUserId,
      action: 'SEND',
      entityType: 'PayslipEmail',
      after: { year: params.year, month: params.month, sentCount, failedCount },
    });

    return { sentCount, failedCount, results };
  }
}
