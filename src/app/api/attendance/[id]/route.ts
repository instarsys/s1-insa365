import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1];

  if (!id) return errorResponse('ID를 지정해주세요.', 400);

  const attendance = await prisma.attendance.findFirst({
    where: {
      id,
      companyId: auth.companyId,
      deletedAt: null,
    },
  });

  if (!attendance) return notFoundResponse('근태 기록');

  await prisma.attendance.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

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
