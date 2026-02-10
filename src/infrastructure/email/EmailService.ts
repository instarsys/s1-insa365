/**
 * 이메일 발송 서비스 (MVP: stub)
 * Post-MVP에서 Resend API로 전환
 */
export class EmailService {
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
}
