import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ message: '주소를 입력해주세요.' }, { status: 400 });
  }

  const { kakaoGeocodingService } = getContainer();
  const result = await kakaoGeocodingService.geocode(address);

  return NextResponse.json({
    latitude: result?.latitude ?? null,
    longitude: result?.longitude ?? null,
  });
}

export const GET = withAuth(handler);
