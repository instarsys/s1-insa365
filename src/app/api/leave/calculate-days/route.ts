import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { countWorkDaysInRange } from '@/domain/services/WorkDayCalculator';

async function handler(request: NextRequest, auth: AuthContext) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return errorResponse('startDate와 endDate를 지정해주세요.', 400);
  }

  const { employeeRepo, workPolicyRepo, companyHolidayRepo } = getContainer();

  // 직원의 WorkPolicy 조회
  const employee = await employeeRepo.findById(auth.companyId, auth.userId);
  let workDays = '1,2,3,4,5';

  if (employee?.workPolicyId) {
    const policy = await workPolicyRepo.findById(auth.companyId, employee.workPolicyId);
    if (policy) workDays = policy.workDays;
  } else {
    const defaultPolicy = await workPolicyRepo.findDefault(auth.companyId);
    if (defaultPolicy) workDays = defaultPolicy.workDays;
  }

  // 회사 휴일 조회
  const start = new Date(startDate);
  const end = new Date(endDate);
  const holidays = await companyHolidayRepo.findByPeriod(auth.companyId, start, end);
  const holidayDates = new Set(
    holidays.map((h: { date: Date | string }) => {
      const d = new Date(h.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }),
  );

  const days = countWorkDaysInRange(start, end, workDays, holidayDates);

  return successResponse({ startDate, endDate, days, workDays, holidayCount: holidayDates.size });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
