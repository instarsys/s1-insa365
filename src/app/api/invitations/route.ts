import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { generateInviteCode } from '@/infrastructure/invite/InviteCodeGenerator';
import { z } from 'zod';

const createInvitationSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  sendMethod: z.enum(['NONE', 'IMMEDIATE', 'SCHEDULED']).optional().default('NONE'),
  scheduledAt: z.string().optional(),
});

async function getHandler(request: NextRequest, auth: AuthContext) {
  const { invitationRepo } = getContainer();
  const status = request.nextUrl.searchParams.get('status') || undefined;
  const items = await invitationRepo.findAll(auth.companyId, status);
  return successResponse({ items });
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const validation = validateBody(createInvitationSchema, body);
  if (!validation.success) return validation.response;

  const { invitationRepo } = getContainer();

  // 유니크 코드 생성 (충돌 방지)
  let code = generateInviteCode();
  let attempts = 0;
  while (await invitationRepo.codeExists(code) && attempts < 10) {
    code = generateInviteCode();
    attempts++;
  }
  if (attempts >= 10) {
    return errorResponse('초대 코드 생성에 실패했습니다. 다시 시도해주세요.', 500);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

  const invitation = await invitationRepo.create({
    companyId: auth.companyId,
    inviteCode: code,
    name: validation.data.name,
    email: validation.data.email || null,
    phone: validation.data.phone || null,
    departmentId: validation.data.departmentId || null,
    positionId: validation.data.positionId || null,
    sendMethod: validation.data.sendMethod,
    expiresAt,
    createdBy: auth.userId,
    status: validation.data.sendMethod === 'IMMEDIATE' ? 'SENT' : 'PENDING',
    sentAt: validation.data.sendMethod === 'IMMEDIATE' ? new Date() : null,
  });

  return createdResponse(invitation);
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
