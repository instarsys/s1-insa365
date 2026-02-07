import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const notification = await prisma.notification.findFirst({
    where: { id, companyId: auth.companyId, userId: auth.userId },
  });

  if (!notification) return notFoundResponse('알림');

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });

  return successResponse(updated);
}

function createRoute() {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withAuth(handler);
    return wrapped(request, routeContext);
  };
}

export const PUT = createRoute() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
