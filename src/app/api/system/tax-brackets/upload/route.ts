import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { year, brackets } = await request.json();

    if (!year || !brackets || !Array.isArray(brackets)) {
      return errorResponse('연도와 세액표 데이터를 입력해주세요.', 400);
    }

    // Delete existing brackets for the year
    await prisma.taxBracket.deleteMany({ where: { year } });

    // Bulk create
    const created = await prisma.taxBracket.createMany({
      data: brackets.map((b: { minIncome: number; maxIncome: number; dependents: number; taxAmount: number }) => ({
        year,
        minIncome: b.minIncome,
        maxIncome: b.maxIncome,
        dependents: b.dependents,
        taxAmount: b.taxAmount,
      })),
    });

    await auditLogService.log({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CREATE',
      entityType: 'TaxBracket',
      after: { year, count: created.count } as Record<string, unknown>,
    });

    return successResponse({ year, uploadedCount: created.count });
  } catch {
    return errorResponse('세액표 업로드 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('SYSTEM_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
