import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { generateAccrualsSchema } from '@/presentation/api/schemas';
import { calculateServiceMonths, findMatchingTier, type AccrualTier } from '@/domain/services/LeaveAccrualCalculator';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(generateAccrualsSchema, body);
    if (!validation.success) return validation.response;
    const { year, ruleId } = validation.data;

    const rules = await prisma.leaveAccrualRule.findMany({
      where: {
        companyId: auth.companyId,
        deletedAt: null,
        isActive: true,
        ...(ruleId && { id: ruleId }),
      },
      include: {
        tiers: { orderBy: { sortOrder: 'asc' } },
        leaveGroup: {
          include: {
            leaveTypeConfigs: {
              where: { deletedAt: null, isActive: true },
              take: 1,
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (rules.length === 0) {
      return errorResponse('활성 발생 규칙이 없습니다.', 404);
    }

    const employees = await prisma.user.findMany({
      where: {
        companyId: auth.companyId,
        employeeStatus: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true, joinDate: true },
    });

    let generated = 0;
    let skipped = 0;
    const referenceDate = new Date(year, 0, 1);
    const periodStart = new Date(year, 0, 1);
    const periodEnd = new Date(year, 11, 31);

    for (const rule of rules) {
      const leaveTypeConfig = rule.leaveGroup.leaveTypeConfigs[0];
      if (!leaveTypeConfig) {
        skipped += employees.length;
        continue;
      }

      const tiers: AccrualTier[] = rule.tiers.map((t: { serviceMonthFrom: number; serviceMonthTo: number; accrualDays: number | { toString(): string }; validMonths: number | null }) => ({
        serviceMonthFrom: t.serviceMonthFrom,
        serviceMonthTo: t.serviceMonthTo,
        accrualDays: Number(t.accrualDays),
        validMonths: t.validMonths ?? undefined,
      }));

      for (const emp of employees) {
        if (!emp.joinDate) {
          skipped++;
          continue;
        }

        const existingRecord = await prisma.leaveAccrualRecord.findFirst({
          where: {
            companyId: auth.companyId,
            userId: emp.id,
            accrualRuleId: rule.id,
            year,
          },
        });

        if (existingRecord) {
          skipped++;
          continue;
        }

        const serviceMonths = calculateServiceMonths(emp.joinDate, referenceDate);
        const matchedTier = findMatchingTier(serviceMonths, tiers);

        if (!matchedTier) {
          skipped++;
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.leaveAccrualRecord.create({
            data: {
              companyId: auth.companyId,
              userId: emp.id,
              leaveTypeConfigId: leaveTypeConfig.id,
              accrualRuleId: rule.id,
              year,
              accrualDays: matchedTier.accrualDays,
              periodStart,
              periodEnd,
              expiresAt: matchedTier.validMonths
                ? new Date(year, matchedTier.validMonths, 0)
                : null,
              source: 'RULE',
            },
          });

          await tx.leaveBalance.upsert({
            where: {
              companyId_userId_year: {
                companyId: auth.companyId,
                userId: emp.id,
                year,
              },
            },
            create: {
              companyId: auth.companyId,
              userId: emp.id,
              year,
              totalDays: matchedTier.accrualDays,
              remainingDays: matchedTier.accrualDays,
            },
            update: {
              totalDays: { increment: matchedTier.accrualDays },
              remainingDays: { increment: matchedTier.accrualDays },
            },
          });
        });

        generated++;
      }
    }

    return successResponse({ generated, skipped });
  } catch {
    return errorResponse('연차 발생 실행 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
