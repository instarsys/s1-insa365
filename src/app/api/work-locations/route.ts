import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, createdResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handleGet(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get('includeInactive') === 'true';

  const { crudWorkLocationUseCase } = getContainer();
  const locations = await crudWorkLocationUseCase.list(auth.companyId, includeInactive);

  const items = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    address: loc.address,
    latitude: loc.latitude ? Number(loc.latitude) : null,
    longitude: loc.longitude ? Number(loc.longitude) : null,
    radiusMeters: loc.radiusMeters,
    isDefault: loc.isDefault,
    isActive: loc.isActive,
  }));

  return successResponse({ items });
}

async function handlePost(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'SYSTEM_ADMIN') {
    return errorResponse('권한이 없습니다.', 403);
  }

  const body = await request.json();
  if (!body.name || !body.address) {
    return errorResponse('장소명과 주소는 필수입니다.', 400);
  }

  const { crudWorkLocationUseCase } = getContainer();
  const created = await crudWorkLocationUseCase.create(auth.companyId, {
    name: body.name,
    address: body.address,
    latitude: body.latitude,
    longitude: body.longitude,
    radiusMeters: body.radiusMeters,
    isDefault: body.isDefault,
  });

  return createdResponse(created);
}

const wrappedGet = withAuth(handleGet);
const wrappedPost = withAuth(handlePost);

export const GET = wrappedGet as (request: NextRequest) => Promise<NextResponse>;
export const POST = wrappedPost as (request: NextRequest) => Promise<NextResponse>;
