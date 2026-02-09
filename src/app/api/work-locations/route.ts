import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const locations = await prisma.workLocation.findMany({
    where: {
      companyId: auth.companyId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
    },
    orderBy: { name: 'asc' },
  });

  // Convert Decimal to number for client consumption
  const items = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    latitude: loc.latitude ? Number(loc.latitude) : 0,
    longitude: loc.longitude ? Number(loc.longitude) : 0,
    radius: loc.radiusMeters,
  }));

  return successResponse({ items });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
