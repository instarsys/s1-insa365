import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit, userId } = parseSearchParams(url);
  const skip = (page - 1) * limit;

  // EMPLOYEE sees own history only
  const targetUserId = auth.role === 'EMPLOYEE' ? auth.userId : (userId ?? undefined);

  const where = {
    companyId: auth.companyId,
    deletedAt: null,
    status: { in: ['CONFIRMED' as const, 'PAID' as const] },
    ...(targetUserId && { userId: targetUserId }),
  };

  const [items, total] = await Promise.all([
    prisma.salaryCalculation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.salaryCalculation.count({ where }),
  ]);

  const mapped = items.map((item) => ({
    year: item.year,
    month: item.month,
    totalEmployees: 1,
    totalPay: Number(item.totalPay),
    totalDeduction: Number(item.totalDeduction),
    totalNetPay: Number(item.netPay),
    status: item.status,
    confirmedAt: item.confirmedAt,
    // Phase 2: Gross Pay breakdown
    basePay: Number(item.basePay),
    fixedAllowances: Number(item.fixedAllowances),
    overtimePay: Number(item.overtimePay),
    nightPay: Number(item.nightPay),
    holidayPay: Number(item.holidayPay),
    variableAllowances: Number(item.variableAllowances),
    totalNonTaxable: Number(item.totalNonTaxable),
    // Phase 4: Deduction breakdown
    nationalPension: Number(item.nationalPension),
    healthInsurance: Number(item.healthInsurance),
    longTermCare: Number(item.longTermCare),
    employmentInsurance: Number(item.employmentInsurance),
    incomeTax: Number(item.incomeTax),
    localIncomeTax: Number(item.localIncomeTax),
    netPay: Number(item.netPay),
    user: item.user,
  }));

  return successResponse({ items: mapped, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
