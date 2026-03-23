/**
 * 이메일 발송 서비스
 * - RESEND_API_KEY 설정 시 Resend API로 발송
 * - 미설정 시 콘솔 로그 fallback (개발용)
 */
import { Resend } from 'resend';

export class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private appBaseUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@insa365.com';
    this.appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
  }

  isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendInvitation(params: {
    to: string;
    name: string;
    companyName: string;
    inviteCode: string;
    joinUrl: string;
  }): Promise<boolean> {
    // MVP: 콘솔 로그로 대체
    console.log('[EmailService] 합류 초대 이메일 발송 (MVP stub):', {
      to: params.to,
      name: params.name,
      inviteCode: params.inviteCode,
      joinUrl: params.joinUrl,
    });
    return true;
  }

  async sendPayslipEmail(params: {
    to: string;
    employeeName: string;
    companyName: string;
    year: number;
    month: number;
    trackingToken: string;
    htmlContent: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const trackingPixelUrl = `${this.appBaseUrl}/api/payroll/payslips/email-read/${params.trackingToken}`;
    const fullHtml =
      params.htmlContent +
      `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

    if (!this.resend) {
      console.log('[EmailService] 급여명세서 이메일 발송 (미설정 - 콘솔 로그):', {
        to: params.to,
        employeeName: params.employeeName,
        subject: `[insa365] ${params.companyName} ${params.year}년 ${params.month}월 급여명세서`,
      });
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: `[insa365] ${params.companyName} ${params.year}년 ${params.month}월 급여명세서`,
        html: fullHtml,
      });

      return { success: true, messageId: result.data?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '이메일 발송 실패',
      };
    }
  }
}
