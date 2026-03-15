import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const yearCount = (body as { yearCount?: number }).yearCount ?? 5;

    const { userRepo, generateEmployeeAccrualsUseCase } = getContainer();

    const employees = await userRepo.findActiveWithJoinDate(auth.companyId);

    let totalGenerated = 0;
    let totalSkipped = 0;
    let processed = 0;

    for (const emp of employees) {
      if (!emp.joinDate) {
        totalSkipped++;
        continue;
      }

      const result = await generateEmployeeAccrualsUseCase.execute({
        companyId: auth.companyId,
        userId: emp.id,
        joinDate: emp.joinDate,
        yearCount,
      });

      totalGenerated += result.generated;
      totalSkipped += result.skipped;
      processed++;
    }

    return successResponse({
      totalEmployees: employees.length,
      processed,
      totalGenerated,
      totalSkipped,
    });
  } catch {
    return errorResponse('기존 직원 일괄 연차 발생 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
