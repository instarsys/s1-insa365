import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

interface LedgerEntry {
  date: string;
  type: 'ACCRUAL' | 'USAGE' | 'ADJUSTMENT' | 'CARRY_OVER';
  days: number;
  runningBalance: number;
  description: string;
  source: string;
  referenceId?: string;
}

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);

  if (!userId) {
    return errorResponse('userId가 필요합니다.', 400);
  }

  const { leaveAccrualRecordRepo, leaveRequestRepo } = getContainer();

  const [accrualRecords, leaveRequests] = await Promise.all([
    leaveAccrualRecordRepo.findByUserAndYear(auth.companyId, userId, year),
    leaveRequestRepo.findApprovedByUserAndYear(auth.companyId, userId, year),
  ]);

  const entries: LedgerEntry[] = [];

  // Accrual records → ledger entries
  for (const rec of accrualRecords) {
    const accrualDays = Number(rec.accrualDays);
    let entryType: LedgerEntry['type'];
    let description: string;

    if (rec.source === 'MANUAL') {
      entryType = 'ADJUSTMENT';
      description = rec.description || '수동 보정';
    } else if (rec.source === 'CARRY_OVER') {
      entryType = 'CARRY_OVER';
      description = '전년도 이월';
    } else {
      entryType = 'ACCRUAL';
      const ruleName = rec.accrualRule?.name ?? '';
      const typeName = rec.leaveTypeConfig?.name ?? '';
      description = ruleName ? `${typeName} (${ruleName})` : typeName || '자동 발생';
    }

    entries.push({
      date: new Date(rec.periodStart).toISOString().slice(0, 10),
      type: entryType,
      days: accrualDays,
      runningBalance: 0, // will be calculated below
      description,
      source: rec.source,
      referenceId: rec.id,
    });
  }

  // Leave requests (APPROVED) → usage entries
  for (const req of leaveRequests) {
    const days = Number(req.days);
    const typeName = req.leaveTypeConfig?.name ?? req.type;
    const start = new Date(req.startDate).toISOString().slice(0, 10);
    const end = new Date(req.endDate).toISOString().slice(0, 10);

    entries.push({
      date: start,
      type: 'USAGE',
      days: -days,
      runningBalance: 0,
      description: start === end ? `${typeName} (${start.slice(5)})` : `${typeName} (${start.slice(5)}~${end.slice(5)})`,
      source: 'LEAVE_REQUEST',
      referenceId: req.id,
    });
  }

  // Sort by date, then accruals before usage
  const typeOrder: Record<string, number> = { ACCRUAL: 0, CARRY_OVER: 1, ADJUSTMENT: 2, USAGE: 3 };
  entries.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
  });

  // Calculate running balance
  let balance = 0;
  for (const entry of entries) {
    balance += entry.days;
    entry.runningBalance = Math.round(balance * 10) / 10; // avoid floating point
  }

  return successResponse({ items: entries });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
