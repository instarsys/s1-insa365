import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';

// Health check — 인프라 엔드포인트 (비즈니스 로직 아님, prisma 직접 사용 허용)
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
