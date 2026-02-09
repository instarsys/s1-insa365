import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { salaryCalcRepo } = getContainer();
  const calculations = await salaryCalcRepo.findConfirmedWithInsuranceInfo(auth.companyId, year, month);

  const summary = {
    nationalPension: {
      employeeTotal: calculations.reduce((s, c) => s + Number(c.nationalPension), 0),
      employerTotal: calculations.reduce((s, c) => s + Number(c.nationalPension), 0), // same rate
      enrolledCount: calculations.filter((c) => c.user.nationalPensionMode !== 'NONE').length,
    },
    healthInsurance: {
      employeeTotal: calculations.reduce((s, c) => s + Number(c.healthInsurance), 0),
      employerTotal: calculations.reduce((s, c) => s + Number(c.healthInsurance), 0),
      enrolledCount: calculations.filter((c) => c.user.healthInsuranceMode !== 'NONE').length,
    },
    longTermCare: {
      employeeTotal: calculations.reduce((s, c) => s + Number(c.longTermCare), 0),
      employerTotal: calculations.reduce((s, c) => s + Number(c.longTermCare), 0),
    },
    employmentInsurance: {
      employeeTotal: calculations.reduce((s, c) => s + Number(c.employmentInsurance), 0),
      enrolledCount: calculations.filter((c) => c.user.employmentInsuranceMode !== 'NONE').length,
    },
  };

  return successResponse({ year, month, summary, items: calculations });
}

export const GET = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
