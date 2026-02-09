'use client';

import { useState } from 'react';

interface MonthlyData {
  userId: string;
  userName: string;
  departmentName?: string;
  months: Record<number, { count: number; days: number }>;
  [key: string]: unknown;
}

interface LeaveHistoryMonthlyViewProps {
  items: MonthlyData[];
  year: number;
}

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export function LeaveHistoryMonthlyView({ items, year }: LeaveHistoryMonthlyViewProps) {
  const [showDays, setShowDays] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">{year}년</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDays(false)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${!showDays ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            총 횟수
          </button>
          <button
            onClick={() => setShowDays(true)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${showDays ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            차감 일수
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500">직원</th>
              <th className="sticky left-[120px] z-10 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500">부서</th>
              {MONTH_LABELS.map((m, i) => (
                <th key={i} className="min-w-[48px] px-2 py-2 text-center text-xs font-medium text-gray-500">{m}</th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">합계</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-12 text-center text-gray-400">데이터가 없습니다</td>
              </tr>
            ) : (
              items.map((item) => {
                let total = 0;
                return (
                  <tr key={item.userId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm font-medium text-gray-800">{item.userName}</td>
                    <td className="sticky left-[120px] z-10 bg-white px-3 py-2 text-xs text-gray-500">{item.departmentName || '-'}</td>
                    {MONTH_LABELS.map((_, i) => {
                      const monthData = item.months[i + 1];
                      const val = monthData ? (showDays ? monthData.days : monthData.count) : 0;
                      total += val;
                      return (
                        <td key={i} className="px-2 py-2 text-center text-sm">
                          {val > 0 ? (
                            <span className="font-medium text-indigo-600">{val}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">{total > 0 ? total : '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
