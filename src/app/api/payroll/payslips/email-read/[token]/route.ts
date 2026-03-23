import { NextRequest } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';

// 1x1 transparent GIF (43 bytes)
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

/**
 * 트래킹 픽셀 엔드포인트 (공개 — 인증 없음)
 * 이메일 클라이언트가 이미지를 로드할 때 열람 상태를 기록
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const { recordPayslipEmailOpenUseCase } = getContainer();
    await recordPayslipEmailOpenUseCase.execute(token);
  } catch {
    // 에러 시에도 GIF 응답 보장 (이메일 클라이언트 깨지지 않도록)
  }

  return new Response(PIXEL_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
