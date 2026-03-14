import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { encryptionService } from '@/infrastructure/encryption/EncryptionService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const url = new URL(request.url);
  const field = url.searchParams.get('field');

  if (!field || !['bankAccount', 'rrn'].includes(field)) {
    return errorResponse('field 파라미터가 필요합니다. (bankAccount 또는 rrn)', 400);
  }

  if (!auth.canViewSensitive) {
    return errorResponse('민감정보 조회 권한이 없습니다.', 403);
  }

  const { employeeRepo, auditLogRepo } = getContainer();
  const employee = await employeeRepo.findById(auth.companyId, id);
  if (!employee) return notFoundResponse('직원');

  let decrypted: string | null = null;
  const encryptedField = field === 'bankAccount' ? 'encryptedBankAccount' : 'encryptedRrn';
  const encryptedValue = (employee as Record<string, unknown>)[encryptedField] as string | null;

  if (encryptedValue) {
    decrypted = encryptionService.decrypt(encryptedValue);
  }

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'READ',
    entityType: 'User',
    entityId: id,
    after: { field, action: 'PII_DECRYPT' },
  });

  return successResponse({ field, value: decrypted });
}

function createHandler() {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withAuth(handleGet);
    return wrapped(request, routeContext);
  };
}

export const GET = createHandler() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
