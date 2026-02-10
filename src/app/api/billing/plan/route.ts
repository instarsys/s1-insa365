import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';

const PLAN_CONFIG: Record<string, { maxEmployees: number; pricePerEmployee: number }> = {
  TRIAL: { maxEmployees: 5, pricePerEmployee: 0 },
  STARTER: { maxEmployees: 50, pricePerEmployee: 2000 },
  PRO: { maxEmployees: 300, pricePerEmployee: 3500 },
};

async function handler(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const { plan } = body as { plan: string };

  if (!plan || !PLAN_CONFIG[plan]) {
    return NextResponse.json({ message: '유효하지 않은 플랜입니다.' }, { status: 400 });
  }

  const { subscriptionRepo } = getContainer();
  const config = PLAN_CONFIG[plan];

  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await subscriptionRepo.update(auth.companyId, {
    plan,
    status: plan === 'TRIAL' ? 'TRIAL_ACTIVE' : 'ACTIVE',
    maxEmployees: config.maxEmployees,
    pricePerEmployee: config.pricePerEmployee,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
  });

  return NextResponse.json({ success: true, plan });
}

export const PUT = withAuth(handler);
