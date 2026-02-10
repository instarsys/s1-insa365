import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';

const PLAN_CONFIG: Record<string, { maxEmployees: number; pricePerEmployee: number }> = {
  TRIAL: { maxEmployees: 5, pricePerEmployee: 0 },
  STARTER: { maxEmployees: 50, pricePerEmployee: 2000 },
  PRO: { maxEmployees: 300, pricePerEmployee: 3500 },
};

async function handler(_request: NextRequest, auth: AuthContext) {
  const { subscriptionRepo, employeeRepo } = getContainer();

  let subscription = await subscriptionRepo.findByCompanyId(auth.companyId);

  // 구독이 없으면 TRIAL로 자동 생성
  if (!subscription) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await subscriptionRepo.upsert(auth.companyId, {
      plan: 'TRIAL',
      status: 'TRIAL_ACTIVE',
      trialEndsAt: trialEnd,
      maxEmployees: 5,
      pricePerEmployee: 0,
    });
    // re-fetch with payments included
    subscription = await subscriptionRepo.findByCompanyId(auth.companyId);
  }

  // 현재 직원 수
  const employeeCount = await employeeRepo.countByStatus(auth.companyId, 'ACTIVE');

  return NextResponse.json({
    subscription,
    employeeCount,
    planConfig: PLAN_CONFIG,
  });
}

export const GET = withAuth(handler);
