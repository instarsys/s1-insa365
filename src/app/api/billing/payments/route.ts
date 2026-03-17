import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { subscriptionRepo, paymentRepo } = getContainer();

  const subscription = await subscriptionRepo.findByCompanyId(auth.companyId);
  if (!subscription) {
    return NextResponse.json({ payments: [] });
  }

  const payments = await paymentRepo.findBySubscriptionId(auth.companyId, subscription.id);
  return NextResponse.json({ payments });
}

export const GET = withAuth(handler);
