import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';

/**
 * POST /api/billing/card — 카드 등록 (빌링키 발급)
 * MVP: 실제 토스페이먼츠 연동 대신 모의 등록
 * 프로덕션에서는 authKey로 빌링키 발급 API 호출
 */
async function postHandler(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const { lastCardDigits, cardBrand } = body as { lastCardDigits: string; cardBrand: string };

  if (!lastCardDigits || !cardBrand) {
    return NextResponse.json({ message: '카드 정보가 필요합니다.' }, { status: 400 });
  }

  const { subscriptionRepo } = getContainer();

  // MVP: billingKey는 모의 값 (프로덕션: 토스 SDK authKey → billingKey 발급)
  const billingKey = `billing_${auth.companyId}_${Date.now()}`;

  await subscriptionRepo.update(auth.companyId, {
    billingKey,
    lastCardDigits,
    cardBrand,
    pgCustomerId: `cust_${auth.companyId}`,
  });

  return NextResponse.json({ success: true, lastCardDigits, cardBrand });
}

/**
 * DELETE /api/billing/card — 카드 삭제
 */
async function deleteHandler(_request: NextRequest, auth: AuthContext) {
  const { subscriptionRepo } = getContainer();

  await subscriptionRepo.update(auth.companyId, {
    billingKey: null,
    lastCardDigits: null,
    cardBrand: null,
    pgCustomerId: null,
  });

  return NextResponse.json({ success: true });
}

export const POST = withAuth(postHandler);
export const DELETE = withAuth(deleteHandler);
