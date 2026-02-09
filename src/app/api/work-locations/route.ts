import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { workLocationRepo } = getContainer();
  const locations = await workLocationRepo.findAll(auth.companyId);

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
