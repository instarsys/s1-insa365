import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { type AuditAction } from '@/generated/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit } = parseSearchParams(url);
  const entityType = url.searchParams.get('entityType') ?? undefined;
  const action = url.searchParams.get('action') as AuditAction | undefined;
  const userId = url.searchParams.get('userId') ?? undefined;
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const { auditLogRepo } = getContainer();
  const { items, total } = await auditLogRepo.findAll(auth.companyId, {
    entityType,
    action: action ?? undefined,
    userId,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    page,
    limit,
  });

  return successResponse({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export const GET = withRole('SYSTEM_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
