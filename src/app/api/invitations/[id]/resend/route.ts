import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const id = request.nextUrl.pathname.split('/').at(-2)!;
  const { invitationRepo } = getContainer();

  const invitation = await invitationRepo.findById(auth.companyId, id);
  if (!invitation) return errorResponse('초대를 찾을 수 없습니다.', 404);
  if (invitation.status === 'ACCEPTED') return errorResponse('이미 수락된 초대입니다.', 400);
  if (invitation.status === 'CANCELLED') return errorResponse('취소된 초대입니다.', 400);

  const updated = await invitationRepo.update(auth.companyId, id, {
    status: 'SENT',
    sentAt: new Date(),
  });

  return successResponse(updated);
}

export const POST = withAuth(handler);
