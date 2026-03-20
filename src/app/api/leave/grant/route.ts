import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { createdResponse, errorResponse } from '@/presentation/api/helpers';
import { grantLeaveSchema } from '@/presentation/api/schemas/leave';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

async function handler(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const parsed = grantLeaveSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.';
    return errorResponse(firstError, 400);
  }

  const { grantLeaveUseCase } = getContainer();
  const { reason, ...rest } = parsed.data;

  try {
    const result = await grantLeaveUseCase.execute(auth.companyId, auth.userId, {
      ...rest,
      reason: reason ?? undefined,
    });
    return createdResponse(result);
  } catch (err) {
    if (err instanceof EntityNotFoundError) {
      return errorResponse(err.message, 404);
    }
    if (err instanceof ValidationError) {
      return errorResponse(err.message, 400);
    }
    throw err;
  }
}

export const POST = withRole('MANAGER', handler);
