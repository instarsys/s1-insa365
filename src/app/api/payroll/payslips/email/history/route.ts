import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

interface EmailLogWithUser {
  id: string;
  userId: string;
  recipientEmail: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  failReason: string | null;
  createdAt: string;
  user: {
    name: string;
    employeeNumber: string | null;
    email: string;
    department: { name: string } | null;
  };
}

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '', 10);
    const month = parseInt(searchParams.get('month') || '', 10);

    if (!year || !month) {
      return errorResponse('year, month 파라미터가 필요합니다.', 400);
    }

    const { getPayslipEmailHistoryUseCase } = getContainer();
    const logs = (await getPayslipEmailHistoryUseCase.execute(
      auth.companyId,
      year,
      month,
    )) as EmailLogWithUser[];

    // API 응답 평탄화 (nested → flat)
    const items = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user?.name ?? '',
      employeeNumber: log.user?.employeeNumber ?? '',
      departmentName: log.user?.department?.name ?? '',
      recipientEmail: log.recipientEmail,
      status: log.status,
      sentAt: log.sentAt,
      openedAt: log.openedAt,
      failReason: log.failReason,
      createdAt: log.createdAt,
    }));

    return successResponse({ items });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : '발송 이력 조회 중 오류가 발생했습니다.',
      500,
    );
  }
}

export const GET = withRole('COMPANY_ADMIN', handler) as (
  request: NextRequest,
) => Promise<NextResponse>;
