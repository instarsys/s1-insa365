import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const year = url.searchParams.get('year')
    ? parseInt(url.searchParams.get('year')!, 10)
    : new Date().getFullYear();
  const userId = url.searchParams.get('userId') ?? undefined;
  const departmentId = url.searchParams.get('departmentId') ?? undefined;

  const records = await prisma.leaveAccrualRecord.findMany({
    where: {
      companyId: auth.companyId,
      year,
      ...(userId && { userId }),
      ...(departmentId && { user: { departmentId } }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          joinDate: true,
          department: { select: { name: true } },
        },
      },
      leaveTypeConfig: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const userMap = new Map<string, {
    userId: string;
    userName: string;
    departmentName: string | null;
    joinDate: Date | null;
    records: {
      leaveTypeName: string;
      leaveTypeCode: string;
      accrualDays: number;
      usedDays: number;
      remainingDays: number;
      periodStart: Date;
      periodEnd: Date;
      source: string;
    }[];
    totalAccrualDays: number;
    totalUsedDays: number;
    totalRemainingDays: number;
  }>();

  for (const r of records) {
    const accrual = Number(r.accrualDays);
    const used = Number(r.usedDays);
    const remaining = accrual - used;

    const record = {
      leaveTypeName: r.leaveTypeConfig.name,
      leaveTypeCode: r.leaveTypeConfig.code,
      accrualDays: accrual,
      usedDays: used,
      remainingDays: remaining,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      source: r.source,
    };

    const existing = userMap.get(r.userId);
    if (existing) {
      existing.records.push(record);
      existing.totalAccrualDays += accrual;
      existing.totalUsedDays += used;
      existing.totalRemainingDays += remaining;
    } else {
      userMap.set(r.userId, {
        userId: r.userId,
        userName: r.user.name,
        departmentName: r.user.department?.name ?? null,
        joinDate: r.user.joinDate,
        records: [record],
        totalAccrualDays: accrual,
        totalUsedDays: used,
        totalRemainingDays: remaining,
      });
    }
  }

  const items = Array.from(userMap.values()).sort((a, b) =>
    a.userName.localeCompare(b.userName, 'ko'),
  );

  return successResponse({ items });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
