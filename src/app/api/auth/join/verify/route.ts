import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ valid: false, message: '초대 코드를 입력해주세요.' }, { status: 400 });
  }

  const { invitationRepo } = getContainer();
  const invitation = await invitationRepo.findByCode(code);

  if (!invitation) {
    return NextResponse.json({ valid: false, message: '유효하지 않은 초대 코드입니다.' });
  }
  if (invitation.status === 'ACCEPTED') {
    return NextResponse.json({ valid: false, message: '이미 사용된 초대 코드입니다.' });
  }
  if (invitation.status === 'CANCELLED') {
    return NextResponse.json({ valid: false, message: '취소된 초대입니다.' });
  }
  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ valid: false, message: '만료된 초대 코드입니다.' });
  }

  return NextResponse.json({
    valid: true,
    name: invitation.name,
    companyName: invitation.company?.name ?? '',
  });
}
