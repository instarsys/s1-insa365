import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { sendPayslipEmailSchema } from '@/presentation/api/schemas';
import { ValidationError } from '@domain/errors';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(sendPayslipEmailSchema, body);
    if (!validation.success) return validation.response;
    const { year, month, userIds } = validation.data;

    const { sendPayslipEmailUseCase } = getContainer();
    const result = await sendPayslipEmailUseCase.execute({
      companyId: auth.companyId,
      year,
      month,
      userIds,
      sentByUserId: auth.userId,
    });

    return successResponse(result);
  } catch (err) {
    const status = err instanceof ValidationError ? 400 : 500;
    return errorResponse(
      err instanceof Error ? err.message : '이메일 발송 중 오류가 발생했습니다.',
      status,
    );
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (
  request: NextRequest,
) => Promise<NextResponse>;
