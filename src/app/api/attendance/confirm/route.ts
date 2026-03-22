import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withPermission } from '@/presentation/middleware/withPermission';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { confirmAttendanceSchema } from '@/presentation/api/schemas';
import { ValidationError } from '@domain/errors';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(confirmAttendanceSchema, body);
    if (!validation.success) return validation.response;
    const { year, month, userIds, payrollGroupId } = validation.data;

    const { confirmAttendanceUseCase } = getContainer();
    const result = await confirmAttendanceUseCase.execute(
      auth.companyId,
      { year, month, userIds, payrollGroupId },
      auth.userId,
    );

    return successResponse(result);
  } catch (err) {
    console.error('[attendance/confirm] 근태 확정 오류:', err);
    const status = err instanceof ValidationError ? 400 : 500;
    return errorResponse(err instanceof Error ? err.message : '근태 확정 중 오류가 발생했습니다.', status);
  }
}

export const POST = withPermission('ATTENDANCE_MGMT', 'CONFIRM', handler) as (request: NextRequest) => Promise<NextResponse>;
