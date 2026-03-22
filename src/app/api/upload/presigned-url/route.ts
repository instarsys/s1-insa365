import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { ValidationError } from '@domain/errors';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { category, contentType } = await request.json();

    if (!category || !contentType) {
      return errorResponse('category와 contentType을 지정해주세요.', 400);
    }

    const { getPresignedUploadUrlUseCase } = getContainer();
    const result = await getPresignedUploadUrlUseCase.execute(auth.companyId, category, contentType);

    return successResponse(result);
  } catch (err) {
    const status = err instanceof ValidationError ? 400 : 500;
    return errorResponse(err instanceof Error ? err.message : '업로드 URL 생성에 실패했습니다.', status);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
