'use client';

import { Fragment, useState } from 'react';
import { Badge, Spinner } from '@/components/ui';
import { useLeaveLedger, type LedgerEntry } from '@/hooks/useLeave';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

interface BalanceRow {
  userId: string;
  userName: string;
  departmentName: string | null;
  joinDate?: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface Props {
  balances: BalanceRow[];
  year: number;
  onAdjust: (userId: string, userName: string) => void;
}

function LedgerBadge({ type }: { type: LedgerEntry['type'] }) {
  switch (type) {
    case 'ACCRUAL':
      return <Badge variant="success">자동발생</Badge>;
    case 'USAGE':
      return <Badge variant="info">사용</Badge>;
    case 'ADJUSTMENT':
      return <Badge variant="warning">보정</Badge>;
    case 'CARRY_OVER':
      return <Badge variant="gray">이월</Badge>;
    default:
      return <Badge variant="gray">{type}</Badge>;
  }
}

function InlineLedger({ userId, year, onAdjust, userName }: { userId: string; year: number; onAdjust: () => void; userName: string }) {
  const { entries, isLoading } = useLeaveLedger(userId, year);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={7} className="px-6 py-4">
          <Spinner text="원장을 불러오는 중..." className="py-2" />
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={7} className="bg-gray-50/50 px-0 py-0">
        <div className="px-8 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-500">연차 원장 — {userName}</h4>
            <button
              onClick={onAdjust}
              className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
            >
              <Plus className="h-3 w-3" />
              보정
            </button>
          </div>
          {entries.length === 0 ? (
            <p className="py-2 text-xs text-gray-400">발생/사용 이력이 없습니다.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-1.5 text-left font-medium">날짜</th>
                  <th className="py-1.5 text-left font-medium">구분</th>
                  <th className="py-1.5 text-right font-medium">일수</th>
                  <th className="py-1.5 text-right font-medium">잔여</th>
                  <th className="py-1.5 text-left font-medium pl-4">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 text-gray-600">{entry.date}</td>
                    <td className="py-1.5"><LedgerBadge type={entry.type} /></td>
                    <td className={`py-1.5 text-right font-medium ${entry.days > 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {entry.days > 0 ? `+${entry.days}` : entry.days}
                    </td>
                    <td className="py-1.5 text-right text-gray-700">{entry.runningBalance}</td>
                    <td className="py-1.5 pl-4 text-gray-500">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}

export function LeaveBalanceExpandableTable({ balances, year, onAdjust }: Props) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const toggleRow = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="w-8 px-3 py-3" />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">직원</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">부서</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">입사일</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">총 부여</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">사용</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">잔여</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {balances.map((row) => {
            const isExpanded = expandedUserId === row.userId;
            const remaining = row.remainingDays;
            return (
              <Fragment key={row.userId}>
                <tr
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50/30' : ''}`}
                  onClick={() => toggleRow(row.userId)}
                >
                  <td className="px-3 py-3 text-gray-400">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{row.userName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.departmentName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.joinDate ? new Date(row.joinDate).toISOString().slice(2, 7).replace('-', '.') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{row.totalDays}일</td>
                  <td className="px-4 py-3 text-right text-gray-700">{row.usedDays}일</td>
                  <td className="px-4 py-3 text-right">
                    <span className={remaining === 0 ? 'font-semibold text-red-600' : remaining <= 5 ? 'font-medium text-amber-600' : 'text-gray-700'}>
                      {remaining}일
                      {remaining === 0 && <span className="ml-1 text-[10px]">소진</span>}
                    </span>
                  </td>
                </tr>
                {isExpanded && (
                  <InlineLedger
                    userId={row.userId}
                    year={year}
                    userName={row.userName}
                    onAdjust={() => onAdjust(row.userId, row.userName)}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
