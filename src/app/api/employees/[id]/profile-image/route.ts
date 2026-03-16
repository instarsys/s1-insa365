import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePost(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { s3Service, employeeRepo } = getContainer();

  if (!s3Service.isConfigured()) {
    return errorResponse('S3 스토리지가 설정되지 않았습니다. 관리자에게 문의하세요.', 503);
  }

  const body = await request.json();
  const contentType = body.contentType as string;
  if (!contentType || !contentType.startsWith('image/')) {
    return errorResponse('이미지 파일만 업로드할 수 있습니다.', 400);
  }

  const employee = await employeeRepo.findById(auth.companyId, id);
  if (!employee) return notFoundResponse('직원');

  const ext = contentType.split('/')[1] || 'png';
  const key = `profile-images/${auth.companyId}/${randomUUID()}.${ext}`;

  const { uploadUrl, imageUrl } = await s3Service.getPresignedUploadUrl(key, contentType);

  return successResponse({ uploadUrl, imageUrl });
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { employeeRepo } = getContainer();
  const employee = await employeeRepo.findById(auth.companyId, id);
  if (!employee) return notFoundResponse('직원');

  await employeeRepo.update(auth.companyId, id, { profileImageUrl: null });

  return successResponse({ message: '프로필 이미지가 삭제되었습니다.' });
}

function createHandler(method: 'POST' | 'DELETE') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { POST: handlePost, DELETE: handleDelete };
    const wrapped = withAuth(methods[method]);
    return wrapped(request, routeContext);
  };
}

export const POST = createHandler('POST') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createHandler('DELETE') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
