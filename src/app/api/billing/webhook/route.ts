import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/billing/webhook — PG 웹훅 수신
 * MVP: 스텁 (토스페이먼츠 웹훅 연동은 프로덕션에서)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  // TODO: HMAC 서명 검증
  // const signature = request.headers.get('x-toss-signature');

  console.log('[Billing Webhook]', JSON.stringify(body));

  return NextResponse.json({ success: true });
}
