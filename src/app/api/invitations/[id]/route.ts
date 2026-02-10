import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function deleteHandler(request: NextRequest, auth: AuthContext) {
  const id = request.nextUrl.pathname.split('/').pop()!;
  const { invitationRepo } = getContainer();

  const result = await invitationRepo.cancel(auth.companyId, id);
  if (!result) return errorResponse('취소할 수 없는 초대입니다.', 400);

  return successResponse({ message: '초대가 취소되었습니다.' });
}

export const DELETE = withAuth(deleteHandler);
