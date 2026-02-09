import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1];

  if (!id) return errorResponse('ID를 지정해주세요.', 400);

  const { attendanceRepo } = getContainer();

  // First we need the original record for audit logging
  const attendance = await attendanceRepo.findByIdAndCompany(auth.companyId, id);

  if (!attendance) return notFoundResponse('근태 기록');

  await attendanceRepo.update(auth.companyId, id, { deletedAt: new Date() });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'DELETE',
    entityType: 'Attendance',
    entityId: id,
    before: {
      userId: attendance.userId,
      date: attendance.date.toISOString(),
      status: attendance.status,
    },
  });

  return successResponse({ message: '근태 기록이 삭제되었습니다.' });
}

export const DELETE = withRole('MANAGER', handleDelete) as (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => Promise<NextResponse>;
