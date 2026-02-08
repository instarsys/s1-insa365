import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, forbiddenResponse, errorResponse, createdResponse } from '@/presentation/api/helpers';

async function getHandler(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'SYSTEM_ADMIN') return forbiddenResponse();

  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({
      items: companies.map((c) => ({
        id: c.id,
        name: c.name,
        businessNumber: c.businessNumber,
        representativeName: c.representativeName,
        email: c.email,
        phone: c.phone,
        employeeCount: c._count.users,
        createdAt: c.createdAt.toISOString(),
        isActive: true,
      })),
      total: companies.length,
    });
  } catch (error) {
    console.error('[SUPER_ADMIN_TENANTS_GET]', error);
    return errorResponse('테넌트 목록 조회에 실패했습니다.', 500);
  }
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'SYSTEM_ADMIN') return forbiddenResponse();

  try {
    const body = await request.json();
    const { name, businessNumber, representativeName, email, phone } = body;

    if (!name || !businessNumber) {
      return errorResponse('회사명과 사업자번호는 필수입니다.');
    }

    const company = await prisma.company.create({
      data: {
        name,
        businessNumber,
        representativeName: representativeName ?? '',
        email: email ?? '',
        phone: phone ?? '',
        payDay: 25,
        monthlyWorkHours: 209,
      },
    });

    return createdResponse({ id: company.id, name: company.name });
  } catch (error) {
    console.error('[SUPER_ADMIN_TENANTS_POST]', error);
    return errorResponse('테넌트 생성에 실패했습니다.', 500);
  }
}

export const GET = withAuth(getHandler) as (request: NextRequest) => Promise<NextResponse>;
export const POST = withAuth(postHandler) as (request: NextRequest) => Promise<NextResponse>;
