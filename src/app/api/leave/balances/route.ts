import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse } from '@/presentation/api/helpers';

async function handler(_request: NextRequest, auth: AuthContext) {
  const currentYear = new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: {
      companyId: auth.companyId,
      year: currentYear,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  // Aggregate per userId (sum across leaveTypes)
  const userMap = new Map<string, {
    userId: string;
    userName: string;
    departmentName: string | null;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
  }>();

  for (const b of balances) {
    const total = Number(b.totalDays);
    const used = Number(b.usedDays);
    const existing = userMap.get(b.userId);
    if (existing) {
      existing.totalDays += total;
      existing.usedDays += used;
      existing.remainingDays += (total - used);
    } else {
      userMap.set(b.userId, {
        userId: b.userId,
        userName: b.user.name,
        departmentName: b.user.department?.name ?? null,
        totalDays: total,
        usedDays: used,
        remainingDays: total - used,
      });
    }
  }

  const items = Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName, 'ko'));

  return successResponse({ items });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
